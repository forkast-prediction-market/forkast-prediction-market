-- ============================================================
-- 0006_functions_triggers.sql - Functions and Triggers
-- ============================================================
-- Database functions and triggers for automation

-- Function for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tags_updated_at') THEN
        CREATE TRIGGER update_tags_updated_at
        BEFORE UPDATE ON tags
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') THEN
        CREATE TRIGGER update_events_updated_at
        BEFORE UPDATE ON events
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_markets_updated_at') THEN
        CREATE TRIGGER update_markets_updated_at
        BEFORE UPDATE ON markets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_outcomes_updated_at') THEN
        CREATE TRIGGER update_outcomes_updated_at
        BEFORE UPDATE ON outcomes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sync_status_updated_at') THEN
        CREATE TRIGGER update_sync_status_updated_at
        BEFORE UPDATE ON sync_status
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conditions_updated_at') THEN
        CREATE TRIGGER update_conditions_updated_at
        BEFORE UPDATE ON conditions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_market_resolutions_updated_at') THEN
        CREATE TRIGGER update_market_resolutions_updated_at
        BEFORE UPDATE ON market_resolutions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sports_games_updated_at') THEN
        CREATE TRIGGER update_sports_games_updated_at
        BEFORE UPDATE ON sports_games
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sports_markets_updated_at') THEN
        CREATE TRIGGER update_sports_markets_updated_at
        BEFORE UPDATE ON sports_markets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fpmms_updated_at') THEN
        CREATE TRIGGER update_fpmms_updated_at
        BEFORE UPDATE ON fpmms
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fpmm_pool_memberships_updated_at') THEN
        CREATE TRIGGER update_fpmm_pool_memberships_updated_at
        BEFORE UPDATE ON fpmm_pool_memberships
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sessions_updated_at') THEN
        CREATE TRIGGER update_sessions_updated_at
        BEFORE UPDATE ON sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_accounts_updated_at') THEN
        CREATE TRIGGER update_accounts_updated_at
        BEFORE UPDATE ON accounts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_verifications_updated_at') THEN
        CREATE TRIGGER update_verifications_updated_at
        BEFORE UPDATE ON verifications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to update active markets count per event
CREATE OR REPLACE FUNCTION update_event_markets_count()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
BEGIN
    -- Update affected event counter
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.events
        SET active_markets_count = (
            SELECT count(*)
            FROM public.markets
            WHERE event_id = NEW.event_id AND is_active = true AND is_resolved = false
        ),
        total_markets_count = (
            SELECT count(*) FROM public.markets WHERE event_id = NEW.event_id
        )
        WHERE id = NEW.event_id;
    END IF;

    -- If DELETE or UPDATE that changed event_id
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.event_id != NEW.event_id) THEN
        UPDATE public.events
        SET active_markets_count = (
            SELECT count(*)
            FROM public.markets
            WHERE event_id = OLD.event_id AND is_active = true AND is_resolved = false
        ),
        total_markets_count = (
            SELECT count(*) FROM public.markets WHERE event_id = OLD.event_id
        )
        WHERE id = OLD.event_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Trigger for event counters (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_event_markets_count') THEN
        CREATE TRIGGER trigger_update_event_markets_count
        AFTER INSERT OR UPDATE OR DELETE ON markets
        FOR EACH ROW EXECUTE FUNCTION update_event_markets_count();
    END IF;
END $$;

-- Function to update markets count per tag
CREATE OR REPLACE FUNCTION update_tag_markets_count()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
DECLARE
    affected_event_id INTEGER;
BEGIN
    -- Get the event_id from NEW or OLD
    affected_event_id := COALESCE(NEW.event_id, OLD.event_id);

    -- Update only tags linked to this specific event
    UPDATE public.tags
    SET active_markets_count = (
        SELECT count(DISTINCT m.condition_id)
        FROM public.markets m
        JOIN public.event_tags et ON m.event_id = et.event_id
        WHERE et.tag_id = public.tags.id
        AND m.is_active = true
        AND m.is_resolved = false
    )
    WHERE id IN (
        SELECT DISTINCT et.tag_id
        FROM public.event_tags et
        WHERE et.event_id = affected_event_id
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Trigger for tag counters (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_tag_markets_count') THEN
        CREATE TRIGGER trigger_update_tag_markets_count
        AFTER INSERT OR UPDATE OR DELETE ON markets
        FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_tag_markets_count_event_tags') THEN
        CREATE TRIGGER trigger_update_tag_markets_count_event_tags
        AFTER INSERT OR UPDATE OR DELETE ON event_tags
        FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();
    END IF;
END $$;

-- Add missing trigger for comments updated_at (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN
        CREATE TRIGGER update_comments_updated_at
        BEFORE UPDATE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- 📊 COMMENT COUNTER FUNCTIONS
-- ============================================================
-- Function to update comment likes counter
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
BEGIN
    -- Update likes count for the comment
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments
        SET likes_count = likes_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments
        SET likes_count = greatest(likes_count - 1, 0)
        WHERE id = OLD.comment_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Function to update comment replies counter
CREATE OR REPLACE FUNCTION update_comment_replies_count()
RETURNS TRIGGER
SET search_path = 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
        UPDATE public.comments
        SET replies_count = replies_count + 1
        WHERE id = NEW.parent_comment_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
        UPDATE public.comments
        SET replies_count = greatest(replies_count - 1, 0)
        WHERE id = OLD.parent_comment_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.parent_comment_id != NEW.parent_comment_id THEN
        -- Handle parent change (rare case)
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments
            SET replies_count = greatest(replies_count - 1, 0)
            WHERE id = OLD.parent_comment_id;
        END IF;
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE public.comments
            SET replies_count = replies_count + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for comment counters (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_comment_likes_count') THEN
        CREATE TRIGGER trigger_update_comment_likes_count
        AFTER INSERT OR DELETE ON comment_likes
        FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_comment_replies_count') THEN
        CREATE TRIGGER trigger_update_comment_replies_count
        AFTER INSERT OR UPDATE OR DELETE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count();
    END IF;
END $$;

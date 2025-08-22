-- 003.do.sql - Database Triggers and Functions
-- Auto-update triggers and counter cache functions

-- ============================================================
-- 🔄 AUTO-UPDATE TRIGGERS
-- ============================================================

-- Function for automatic updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outcomes_updated_at BEFORE UPDATE ON outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conditions_updated_at BEFORE UPDATE ON conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_market_resolutions_updated_at BEFORE UPDATE ON market_resolutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sports_games_updated_at BEFORE UPDATE ON sports_games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sports_markets_updated_at BEFORE UPDATE ON sports_markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fpmms_updated_at BEFORE UPDATE ON fpmms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fpmm_pool_memberships_updated_at BEFORE UPDATE ON fpmm_pool_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 📊 FUNCTIONS FOR COUNTER CACHING
-- ============================================================

-- Function to update active markets count per event
CREATE OR REPLACE FUNCTION update_event_markets_count()
RETURNS TRIGGER 
SET search_path = 'public'
AS $$
BEGIN
    -- Update affected event counter
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.events 
        SET 
            active_markets_count = (
                SELECT COUNT(*) 
                FROM public.markets 
                WHERE event_id = NEW.event_id 
                AND is_active = true 
                AND is_resolved = false
            ),
            total_markets_count = (
                SELECT COUNT(*) 
                FROM public.markets 
                WHERE event_id = NEW.event_id
            )
        WHERE id = NEW.event_id;
    END IF;
    
    -- If DELETE or UPDATE that changed event_id
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.event_id != NEW.event_id) THEN
        UPDATE public.events 
        SET 
            active_markets_count = (
                SELECT COUNT(*) 
                FROM public.markets 
                WHERE event_id = OLD.event_id 
                AND is_active = true 
                AND is_resolved = false
            ),
            total_markets_count = (
                SELECT COUNT(*) 
                FROM public.markets 
                WHERE event_id = OLD.event_id
            )
        WHERE id = OLD.event_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for event counters
CREATE TRIGGER trigger_update_event_markets_count
    AFTER INSERT OR UPDATE OR DELETE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_event_markets_count();

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
        SELECT COUNT(DISTINCT m.condition_id)
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
$$ language 'plpgsql';

-- Trigger for tag counters
CREATE TRIGGER trigger_update_tag_markets_count
    AFTER INSERT OR UPDATE OR DELETE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();

CREATE TRIGGER trigger_update_tag_markets_count_event_tags
    AFTER INSERT OR UPDATE OR DELETE ON event_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();

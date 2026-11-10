package com.tifa.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataAggregationService {

    private final JdbcTemplate jdbc;

    @Value("${data.retention.days:30}")
    private int retentionDays;

    @Scheduled(cron = "${scheduler.aggregation.daily.cron}")
    @Transactional
    public void runDailyAggregation() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("=== [Aggregation] Starting daily aggregation for {}", yesterday);
        try {
            int br = aggregateBatteryDaily(yesterday);
            int pr = aggregatePositionDaily(yesterday);
            int sr = aggregateStateDaily(yesterday);
            int tr = aggregateWsTrafficDaily(yesterday);
            int cr = aggregateCommandLogDaily(yesterday);
            log.info("[Aggregation] Daily done: battery={}, position={}, state={}, traffic={}, commands={}", br, pr, sr, tr, cr);
            int purged = purgeRawData();
            log.info("[Aggregation] Purged {} raw records older than {} days", purged, retentionDays);
        } catch (Exception e) {
            log.error("[Aggregation] Daily aggregation failed: {}", e.getMessage(), e);
        }
    }

    @Scheduled(cron = "${scheduler.aggregation.monthly.cron}")
    @Transactional
    public void runMonthlyAggregation() {
        LocalDate lastMonth = LocalDate.now().minusMonths(1);
        int year = lastMonth.getYear();
        int month = lastMonth.getMonthValue();
        log.info("=== [Aggregation] Monthly for {}-{}", year, month);
        try {
            int br = aggregateBatteryMonthly(year, month);
            int sr = aggregateStateMonthly(year, month);
            log.info("[Aggregation] Monthly done: battery={}, state={}", br, sr);
        } catch (Exception e) {
            log.error("[Aggregation] Monthly failed: {}", e.getMessage(), e);
        }
    }

    int aggregateExpressionDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_expression_daily (device_id, company_id, date, total_expressions, " +
            "smile_count, led_green_count, sound_count, other_count) " +
            "SELECT e.device_id, d.company_id, ?::date, COUNT(*), " +
            "COUNT(*) FILTER (WHERE e.expression_type = 'EXPRESSION'), " +
            "COUNT(*) FILTER (WHERE e.expression_type = 'LED' AND e.message = 'GREEN'), " +
            "COUNT(*) FILTER (WHERE e.expression_type = 'SOUND'), " +
            "COUNT(*) FILTER (WHERE e.expression_type IS NULL OR e.expression_type NOT IN ('EXPRESSION','LED','SOUND')) " +
            "FROM h_expression e JOIN m_device d ON d.device_id = e.device_id " +
            "WHERE e.recorded_at >= ?::date AND e.recorded_at < ?::date + 1 " +
            "GROUP BY e.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET " +
            "total_expressions = EXCLUDED.total_expressions, smile_count = EXCLUDED.smile_count, " +
            "led_green_count = EXCLUDED.led_green_count, sound_count = EXCLUDED.sound_count, " +
            "other_count = EXCLUDED.other_count",
            date, date, date);
    }

    int aggregateBatteryDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_battery_daily (device_id, company_id, date, avg_percent, min_percent, max_percent, sample_count) " +
            "SELECT b.device_id, d.company_id, ?::date, " +
            "ROUND(AVG(b.battery_percent)::numeric, 2), ROUND(MIN(b.battery_percent)::numeric, 2), " +
            "ROUND(MAX(b.battery_percent)::numeric, 2), COUNT(*) " +
            "FROM h_battery b JOIN m_device d ON d.device_id = b.device_id " +
            "WHERE b.recorded_at >= ?::date AND b.recorded_at < ?::date + 1 AND b.battery_percent IS NOT NULL " +
            "GROUP BY b.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET avg_percent = EXCLUDED.avg_percent, " +
            "min_percent = EXCLUDED.min_percent, max_percent = EXCLUDED.max_percent, sample_count = EXCLUDED.sample_count",
            date, date, date);
    }

    int aggregateBatteryMonthly(int year, int month) {
        return jdbc.update(
            "INSERT INTO h_battery_monthly (device_id, company_id, year, month, avg_percent, min_percent, max_percent, sample_count) " +
            "SELECT device_id, company_id, ?, ?, " +
            "ROUND(AVG(avg_percent)::numeric, 2), ROUND(MIN(min_percent)::numeric, 2), " +
            "ROUND(MAX(max_percent)::numeric, 2), SUM(sample_count) " +
            "FROM h_battery_daily " +
            "WHERE date >= make_date(?, ?, 1) AND date < make_date(?, ?, 1) + INTERVAL '1 month' " +
            "GROUP BY device_id, company_id " +
            "ON CONFLICT (device_id, year, month) DO UPDATE SET " +
            "avg_percent = EXCLUDED.avg_percent, min_percent = EXCLUDED.min_percent, " +
            "max_percent = EXCLUDED.max_percent, sample_count = EXCLUDED.sample_count",
            year, month, year, month, year, month);
    }

    int aggregatePositionDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_position_daily (device_id, company_id, date, avg_x, avg_y, sample_count) " +
            "SELECT p.device_id, d.company_id, ?::date, " +
            "ROUND(AVG(p.x)::numeric, 2), ROUND(AVG(p.y)::numeric, 2), COUNT(*) " +
            "FROM h_position p JOIN m_device d ON d.device_id = p.device_id " +
            "WHERE p.recorded_at >= ?::date AND p.recorded_at < ?::date + 1 " +
            "GROUP BY p.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET " +
            "avg_x = EXCLUDED.avg_x, avg_y = EXCLUDED.avg_y, sample_count = EXCLUDED.sample_count",
            date, date, date);
    }

    int aggregateStateDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_state_daily (device_id, company_id, date, idle_seconds, moving_seconds, charging_seconds, error_count) " +
            "SELECT s.device_id, d.company_id, ?::date, " +
            "COUNT(*) FILTER (WHERE s.robot_mode = 'IDLE') * 5, " +
            "COUNT(*) FILTER (WHERE s.robot_mode = 'MOVING') * 5, " +
            "COUNT(*) FILTER (WHERE s.robot_mode = 'CHARGING') * 5, " +
            "COUNT(*) FILTER (WHERE s.robot_mode = 'ERROR') " +
            "FROM h_state s JOIN m_device d ON d.device_id = s.device_id " +
            "WHERE s.recorded_at >= ?::date AND s.recorded_at < ?::date + 1 " +
            "GROUP BY s.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET " +
            "idle_seconds = EXCLUDED.idle_seconds, moving_seconds = EXCLUDED.moving_seconds, " +
            "charging_seconds = EXCLUDED.charging_seconds, error_count = EXCLUDED.error_count",
            date, date, date);
    }

    int aggregateStateMonthly(int year, int month) {
        return jdbc.update(
            "INSERT INTO h_state_monthly (device_id, company_id, year, month, idle_seconds, moving_seconds, charging_seconds, error_count) " +
            "SELECT device_id, company_id, ?, ?, " +
            "SUM(idle_seconds), SUM(moving_seconds), SUM(charging_seconds), SUM(error_count) " +
            "FROM h_state_daily " +
            "WHERE date >= make_date(?, ?, 1) AND date < make_date(?, ?, 1) + INTERVAL '1 month' " +
            "GROUP BY device_id, company_id " +
            "ON CONFLICT (device_id, year, month) DO UPDATE SET " +
            "idle_seconds = EXCLUDED.idle_seconds, moving_seconds = EXCLUDED.moving_seconds, " +
            "charging_seconds = EXCLUDED.charging_seconds, error_count = EXCLUDED.error_count",
            year, month, year, month, year, month);
    }

    int aggregateWsTrafficDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_ws_traffic_daily (device_id, company_id, date, total_messages, inbound_count, outbound_count, error_count) " +
            "SELECT t.device_id, d.company_id, ?::date, COUNT(*), " +
            "COUNT(*) FILTER (WHERE t.direction = 'IN'), " +
            "COUNT(*) FILTER (WHERE t.direction = 'OUT'), " +
            "COUNT(*) FILTER (WHERE t.code = 'ERROR') " +
            "FROM h_ws_traffic t JOIN m_device d ON d.device_id = t.device_id " +
            "WHERE t.recorded_at >= ?::date AND t.recorded_at < ?::date + 1 " +
            "GROUP BY t.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET " +
            "total_messages = EXCLUDED.total_messages, inbound_count = EXCLUDED.inbound_count, " +
            "outbound_count = EXCLUDED.outbound_count, error_count = EXCLUDED.error_count",
            date, date, date);
    }

    int aggregateCommandLogDaily(LocalDate date) {
        return jdbc.update(
            "INSERT INTO h_command_log_daily (device_id, company_id, date, total_commands, op_count, move_count, error_count) " +
            "SELECT c.device_id, d.company_id, ?::date, COUNT(*), " +
            "COUNT(*) FILTER (WHERE c.command_code = 'OP'), " +
            "COUNT(*) FILTER (WHERE c.command_code = 'MOVE'), " +
            "COUNT(*) FILTER (WHERE c.status = 'ERROR' OR c.status = 'FAILED') " +
            "FROM h_command_log c JOIN m_device d ON d.device_id = c.device_id " +
            "WHERE c.created_at >= ?::date AND c.created_at < ?::date + 1 " +
            "GROUP BY c.device_id, d.company_id " +
            "ON CONFLICT (device_id, date) DO UPDATE SET " +
            "total_commands = EXCLUDED.total_commands, op_count = EXCLUDED.op_count, " +
            "move_count = EXCLUDED.move_count, error_count = EXCLUDED.error_count",
            date, date, date);
    }

    @Transactional
    public int purgeRawData() {
        String interval = retentionDays + " days";
        int total = 0;
        total += jdbc.update("DELETE FROM h_battery WHERE recorded_at < NOW() - ?::interval", interval);
        total += jdbc.update("DELETE FROM h_position WHERE recorded_at < NOW() - ?::interval", interval);
        total += jdbc.update("DELETE FROM h_state WHERE recorded_at < NOW() - ?::interval", interval);
        total += jdbc.update("DELETE FROM h_ws_traffic WHERE recorded_at < NOW() - ?::interval", interval);
        total += jdbc.update("DELETE FROM h_command_log WHERE created_at < NOW() - ?::interval", interval);
        total += jdbc.update("DELETE FROM h_expression WHERE recorded_at < NOW() - ?::interval", interval);
        return total;
    }

    @Transactional
    public int aggregateLast7Days() {
        int total = 0;
        for (int i = 0; i < 7; i++) {
            LocalDate d = LocalDate.now().minusDays(i + 1);
            total += aggregateBatteryDaily(d);
            total += aggregatePositionDaily(d);
            total += aggregateStateDaily(d);
            total += aggregateWsTrafficDaily(d);
            total += aggregateCommandLogDaily(d);
            total += aggregateExpressionDaily(d);
        }
        return total;
    }
}

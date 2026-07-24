import WidgetKit
import SwiftUI

// MARK: - Shared data (written by the app via the OrbitWidgets Expo module)

private let appGroup = "group.com.martinez.orbit"
private let widgetDataKey = "linked_widget_summary"

struct OrbitSummary: Decodable {
    var nextVisitAt: String?
    var nextEventTitle: String?
    var nextEventAt: String?
    var partnerCheckedIn: Bool
    var mineCheckedIn: Bool
    var currentStreak: Int

    static let empty = OrbitSummary(
        nextVisitAt: nil, nextEventTitle: nil, nextEventAt: nil,
        partnerCheckedIn: false, mineCheckedIn: false, currentStreak: 0
    )
}

private func loadSummary() -> OrbitSummary {
    guard
        let defaults = UserDefaults(suiteName: appGroup),
        let raw = defaults.string(forKey: widgetDataKey),
        let data = raw.data(using: .utf8),
        let summary = try? JSONDecoder().decode(OrbitSummary.self, from: data)
    else { return .empty }
    return summary
}

private func daysUntil(_ iso: String?) -> Int? {
    guard let iso else { return nil }
    let withFractional = ISO8601DateFormatter()
    withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    guard let target = withFractional.date(from: iso) ?? plain.date(from: iso) else {
        return nil
    }
    let start = Calendar.current.startOfDay(for: Date())
    let end = Calendar.current.startOfDay(for: target)
    return Calendar.current.dateComponents([.day], from: start, to: end).day
}

// MARK: - Theme (mirrors src/theme/tokens.ts)

private let canvas = Color(red: 0.082, green: 0.075, blue: 0.094) // #151318
private let accent = Color(red: 0.902, green: 0.224, blue: 0.275) // #E63946
private let flame = Color(red: 1.0, green: 0.549, blue: 0.259) // #FF8C42
private let textPrimary = Color(red: 0.961, green: 0.941, blue: 0.945) // #F5F0F1
private let textSecondary = Color(red: 0.659, green: 0.608, blue: 0.627) // #A89BA0
private let success = Color(red: 0.290, green: 0.871, blue: 0.502) // #4ADE80

// MARK: - Timeline

struct OrbitEntry: TimelineEntry {
    let date: Date
    let summary: OrbitSummary
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> OrbitEntry {
        OrbitEntry(date: Date(), summary: .empty)
    }
    func getSnapshot(in context: Context, completion: @escaping (OrbitEntry) -> Void) {
        completion(OrbitEntry(date: Date(), summary: loadSummary()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<OrbitEntry>) -> Void) {
        let entry = OrbitEntry(date: Date(), summary: loadSummary())
        // The app reloads timelines on every data change; this is just a fallback.
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Views

private struct StreakView: View {
    let streak: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 24))
                .foregroundColor(flame)
            Spacer(minLength: 0)
            Text("\(streak)")
                .font(.system(size: 46, weight: .bold, design: .serif))
                .foregroundColor(textPrimary)
            Text("day streak")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct CheckInRow: View {
    let summary: OrbitSummary
    var body: some View {
        let both = summary.mineCheckedIn && summary.partnerCheckedIn
        HStack(spacing: 5) {
            Circle().fill(both ? success : textSecondary.opacity(0.5))
                .frame(width: 7, height: 7)
            Text(both ? "Both checked in" :
                    (summary.mineCheckedIn ? "You checked in" : "No check-in yet"))
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(textSecondary)
        }
    }
}

private struct MediumView: View {
    let summary: OrbitSummary
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 2) {
                Text("NEXT VISIT")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(textSecondary)
                if let days = daysUntil(summary.nextVisitAt) {
                    Text("\(max(0, days))")
                        .font(.system(size: 44, weight: .bold, design: .serif))
                        .foregroundColor(textPrimary)
                    Text(max(0, days) == 1 ? "day to go" : "days to go")
                        .font(.system(size: 13))
                        .foregroundColor(textSecondary)
                } else {
                    Text("Not set")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(textPrimary)
                        .padding(.top, 6)
                }
                Spacer(minLength: 0)
                CheckInRow(summary: summary)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 5) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 15))
                        .foregroundColor(flame)
                    Text("\(summary.currentStreak)")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(textPrimary)
                }
                Text("day streak")
                    .font(.system(size: 11))
                    .foregroundColor(textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct OrbitWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry
    var body: some View {
        switch family {
        case .systemMedium:
            MediumView(summary: entry.summary)
        default:
            StreakView(streak: entry.summary.currentStreak)
        }
    }
}

struct widget: Widget {
    let kind: String = "OrbitWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            OrbitWidgetView(entry: entry)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Orbit")
        .description("Your streak and next visit, at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    OrbitEntry(date: .now, summary: OrbitSummary(
        nextVisitAt: nil, nextEventTitle: nil, nextEventAt: nil,
        partnerCheckedIn: true, mineCheckedIn: true, currentStreak: 7))
}


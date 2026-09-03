import WidgetKit
import SwiftUI

// MARK: - Shared data (written by the app via the OrbitWidgets Expo module)

private let appGroup = "group.com.martinez.orbit"
private let widgetDataKey = "linked_widget_summary"

struct WidgetGoalItem: Decodable {
    var text: String
    var done: Bool
}

struct OrbitSummary: Decodable {
    var nextVisitAt: String?
    var nextEventTitle: String?
    var nextEventAt: String?
    var partnerCheckedIn: Bool
    var mineCheckedIn: Bool
    var currentStreak: Int
    // New widget fields
    var dailyPhotoUrl: String?
    var partnerPhotoUrl: String?
    var latestDrawingDate: String?
    var weeklyGoals: [WidgetGoalItem]?
    var partnerCity: String?
    var distanceMiles: Double?
    var myCity: String?

    static let empty = OrbitSummary(
        nextVisitAt: nil, nextEventTitle: nil, nextEventAt: nil,
        partnerCheckedIn: false, mineCheckedIn: false, currentStreak: 0,
        dailyPhotoUrl: nil, partnerPhotoUrl: nil, latestDrawingDate: nil,
        weeklyGoals: nil, partnerCity: nil, distanceMiles: nil, myCity: nil
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
private let googleBlue = Color(red: 0.263, green: 0.522, blue: 0.957) // #4285F4

// MARK: - Timeline (shared by all widgets)

struct OrbitEntry: TimelineEntry {
    let date: Date
    let summary: OrbitSummary
    var dailyPhotoData: Data?
    var partnerPhotoData: Data?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> OrbitEntry {
        OrbitEntry(date: Date(), summary: .empty)
    }
    func getSnapshot(in context: Context, completion: @escaping (OrbitEntry) -> Void) {
        let summary = loadSummary()
        completion(OrbitEntry(date: Date(), summary: summary))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<OrbitEntry>) -> Void) {
        let summary = loadSummary()
        // Download photos for the daily photo widget.
        downloadPhotos(summary: summary) { myData, partnerData in
            let entry = OrbitEntry(
                date: Date(), summary: summary,
                dailyPhotoData: myData, partnerPhotoData: partnerData
            )
            let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }
}

private func downloadPhotos(summary: OrbitSummary, completion: @escaping (Data?, Data?) -> Void) {
    let group = DispatchGroup()
    var myData: Data?
    var partnerData: Data?

    if let urlStr = summary.dailyPhotoUrl, let url = URL(string: urlStr) {
        group.enter()
        URLSession.shared.dataTask(with: url) { data, _, _ in
            myData = data
            group.leave()
        }.resume()
    }
    if let urlStr = summary.partnerPhotoUrl, let url = URL(string: urlStr) {
        group.enter()
        URLSession.shared.dataTask(with: url) { data, _, _ in
            partnerData = data
            group.leave()
        }.resume()
    }

    group.notify(queue: .main) {
        completion(myData, partnerData)
    }
}

// MARK: - Existing Views

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

// MARK: - Daily Photo Widget

private struct DailyPhotoView: View {
    let entry: OrbitEntry
    var body: some View {
        let myPhoto = entry.dailyPhotoData.flatMap { UIImage(data: $0) }
        let partnerPhoto = entry.partnerPhotoData.flatMap { UIImage(data: $0) }
        let photo = myPhoto ?? partnerPhoto

        ZStack {
            if let photo {
                Image(uiImage: photo)
                    .resizable()
                    .aspectRatio(contentMode: .fill)

                // Gradient overlay for text legibility
                VStack {
                    Spacer()
                    LinearGradient(
                        colors: [.clear, canvas.opacity(0.85)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .frame(height: 50)
                }

                VStack(alignment: .leading) {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 10))
                        Text("Today")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(textPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                // No photo placeholder
                VStack(spacing: 8) {
                    Image(systemName: "camera")
                        .font(.system(size: 28))
                        .foregroundColor(textSecondary)
                    Text("No photo today")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

struct DailyPhotoWidget: Widget {
    let kind: String = "DailyPhotoWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DailyPhotoView(entry: entry)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Daily Photo")
        .description("Today's photo from you or your partner.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Drawing Widget

private struct DrawingView: View {
    let summary: OrbitSummary
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "pencil.tip.crop.circle")
                .font(.system(size: 24))
                .foregroundColor(accent)
            Spacer(minLength: 0)
            if summary.latestDrawingDate != nil {
                Text("New drawing")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(textPrimary)
                Text("Tap to view")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            } else {
                Text("No drawings")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(textPrimary)
                Text("Send one in the app")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct DrawingWidget: Widget {
    let kind: String = "DrawingWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DrawingView(summary: entry.summary)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Drawings")
        .description("Your latest shared drawing.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Goals Widget

private struct GoalsView: View {
    let goals: [WidgetGoalItem]
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("THIS WEEK")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(textSecondary)
                .padding(.bottom, 2)

            if goals.isEmpty {
                Spacer(minLength: 0)
                Text("No goals set")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(textPrimary)
                Text("Add goals in the app")
                    .font(.system(size: 12))
                    .foregroundColor(textSecondary)
                Spacer(minLength: 0)
            } else {
                ForEach(Array(goals.prefix(5).enumerated()), id: \.offset) { _, goal in
                    HStack(spacing: 6) {
                        Image(systemName: goal.done ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 13))
                            .foregroundColor(goal.done ? success : textSecondary.opacity(0.5))
                        Text(goal.text)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(goal.done ? textSecondary : textPrimary)
                            .lineLimit(1)
                    }
                }
                Spacer(minLength: 0)

                let doneCount = goals.filter { $0.done }.count
                Text("\(doneCount)/\(goals.count) done")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct GoalsWidget: Widget {
    let kind: String = "GoalsWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            GoalsView(goals: entry.summary.weeklyGoals ?? [])
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Weekly Goals")
        .description("Track your shared weekly goals.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Their World Widget (Partner City)

private struct TheirWorldView: View {
    let summary: OrbitSummary
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "cloud.sun.fill")
                .font(.system(size: 22))
                .symbolRenderingMode(.multicolor)
            Spacer(minLength: 0)
            if let city = summary.partnerCity, !city.isEmpty {
                Text(city)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                Text("Their world")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            } else {
                Text("Their world")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(textPrimary)
                Text("City not set")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct TheirWorldWidget: Widget {
    let kind: String = "TheirWorldWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TheirWorldView(summary: entry.summary)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Their World")
        .description("See where your partner is.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Distance Widget

private struct DistanceView: View {
    let summary: OrbitSummary
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "location.fill")
                .font(.system(size: 20))
                .foregroundColor(accent)
            Spacer(minLength: 0)
            if let miles = summary.distanceMiles {
                let rounded = Int(miles.rounded())
                Text("\(rounded)")
                    .font(.system(size: 40, weight: .bold, design: .serif))
                    .foregroundColor(textPrimary)
                    .minimumScaleFactor(0.5)
                Text("miles apart")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            } else {
                Text("Distance")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(textPrimary)
                Text("Location not shared")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct DistanceWidget: Widget {
    let kind: String = "DistanceWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DistanceView(summary: entry.summary)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Distance Apart")
        .description("How far apart you are right now.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Previews

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    OrbitEntry(date: .now, summary: OrbitSummary(
        nextVisitAt: nil, nextEventTitle: nil, nextEventAt: nil,
        partnerCheckedIn: true, mineCheckedIn: true, currentStreak: 7))
}

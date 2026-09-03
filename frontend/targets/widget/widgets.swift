import WidgetKit
import SwiftUI
import MapKit

// MARK: - Shared data (written by the app via the OrbitWidgets Expo module)

private let appGroup = "group.com.martinez.orbit"
private let widgetDataKey = "linked_widget_summary"

struct WidgetGoalItem: Decodable {
    var text: String
    var done: Bool
}

struct WidgetStroke: Decodable {
    var color: String
    var width: Double
    var path: String
}

struct WidgetDrawing: Decodable {
    var width: Double
    var height: Double
    var background: String
    var strokes: [WidgetStroke]
}

struct OrbitSummary: Decodable {
    var nextVisitAt: String? = nil
    var nextEventTitle: String? = nil
    var nextEventAt: String? = nil
    var partnerCheckedIn: Bool
    var mineCheckedIn: Bool
    var currentStreak: Int
    var dailyPhotoUrl: String? = nil
    var partnerPhotoUrl: String? = nil
    var weeklyGoals: [WidgetGoalItem]? = nil
    var latestDrawing: WidgetDrawing? = nil
    var partnerName: String? = nil
    var partnerAvatarUrl: String? = nil
    var localTime: String? = nil
    var timezone: String? = nil
    var weatherSummary: String? = nil
    var temperatureF: Int? = nil
    var statusMessage: String? = nil
    var batteryPercent: Int? = nil
    var myName: String? = nil
    var myCity: String? = nil
    var partnerCity: String? = nil
    var myLat: Double? = nil
    var myLon: Double? = nil
    var partnerLat: Double? = nil
    var partnerLon: Double? = nil
    var distanceMiles: Double? = nil
    var myAvatarUrl: String? = nil

    static let empty = OrbitSummary(
        partnerCheckedIn: false, mineCheckedIn: false, currentStreak: 0
    )

    var photoStatus: String {
        if mineCheckedIn && partnerCheckedIn { return "Both in — streak secured" }
        if mineCheckedIn { return "Waiting for partner" }
        if partnerCheckedIn { return "Partner sent — your turn" }
        return "Send today’s photo"
    }
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

private func parseISO(_ iso: String?) -> Date? {
    guard let iso else { return nil }
    let withFractional = ISO8601DateFormatter()
    withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    return withFractional.date(from: iso) ?? plain.date(from: iso)
}

private func countdown(_ iso: String?) -> String? {
    guard let target = parseISO(iso) else { return nil }
    let diff = target.timeIntervalSinceNow
    if diff <= 0 { return "Together now!" }
    let days = Int(diff) / 86400
    let hours = (Int(diff) % 86400) / 3600
    if days > 0 { return "\(days)d \(hours)h to go" }
    let minutes = (Int(diff) % 3600) / 60
    return "\(hours)h \(minutes)m to go"
}

// MARK: - Theme (mirrors src/theme/tokens.ts)

private let canvas = Color(red: 0.082, green: 0.075, blue: 0.094)
private let accent = Color(red: 0.902, green: 0.224, blue: 0.275)
private let flame = Color(red: 1.0, green: 0.549, blue: 0.259)
private let textPrimary = Color(red: 0.961, green: 0.941, blue: 0.945)
private let textSecondary = Color(red: 0.659, green: 0.608, blue: 0.627)
private let success = Color(red: 0.290, green: 0.871, blue: 0.502)
private let cardFill = Color(red: 0.12, green: 0.11, blue: 0.13)

// MARK: - Timeline

struct OrbitEntry: TimelineEntry {
    let date: Date
    let summary: OrbitSummary
    var dailyPhoto: UIImage?
    var partnerPhoto: UIImage?
    var myAvatar: UIImage?
    var partnerAvatar: UIImage?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> OrbitEntry {
        OrbitEntry(date: Date(), summary: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (OrbitEntry) -> Void) {
        let summary = loadSummary()
        downloadImages(summary: summary) { images in
            completion(OrbitEntry(
                date: Date(),
                summary: summary,
                dailyPhoto: images.daily,
                partnerPhoto: images.partner,
                myAvatar: images.myAvatar,
                partnerAvatar: images.partnerAvatar
            ))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OrbitEntry>) -> Void) {
        let summary = loadSummary()
        downloadImages(summary: summary) { images in
            let entry = OrbitEntry(
                date: Date(),
                summary: summary,
                dailyPhoto: images.daily,
                partnerPhoto: images.partner,
                myAvatar: images.myAvatar,
                partnerAvatar: images.partnerAvatar
            )
            let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }
}

private struct DownloadedImages {
    var daily: UIImage?
    var partner: UIImage?
    var myAvatar: UIImage?
    var partnerAvatar: UIImage?
}

private func fetchImage(_ urlString: String?) -> UIImage? {
    guard let urlString, let url = URL(string: urlString) else { return nil }
    guard let data = try? Data(contentsOf: url) else { return nil }
    return UIImage(data: data)
}

private func downloadImages(summary: OrbitSummary, completion: @escaping (DownloadedImages) -> Void) {
    DispatchQueue.global(qos: .userInitiated).async {
        var images = DownloadedImages()
        images.daily = fetchImage(summary.dailyPhotoUrl)
        images.partner = fetchImage(summary.partnerPhotoUrl)
        images.myAvatar = fetchImage(summary.myAvatarUrl)
        images.partnerAvatar = fetchImage(summary.partnerAvatarUrl)
        DispatchQueue.main.async { completion(images) }
    }
}

private func colorFromHex(_ hex: String) -> Color {
    var h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if h.count == 3 {
        h = h.map { "\($0)\($0)" }.joined()
    }
    guard h.count == 6, let n = UInt64(h, radix: 16) else {
        return Color(red: 0.08, green: 0.07, blue: 0.09)
    }
    return Color(
        red: Double((n >> 16) & 0xFF) / 255,
        green: Double((n >> 8) & 0xFF) / 255,
        blue: Double(n & 0xFF) / 255
    )
}

private func svgPath(_ d: String) -> Path {
    var path = Path()
    let tokens = d.split(whereSeparator: { $0 == " " || $0 == "," }).map(String.init)
    var i = 0
    var started = false
    while i < tokens.count {
        let t = tokens[i]
        if t == "M" || t == "m" || t == "L" || t == "l" {
            guard i + 2 < tokens.count,
                  let x = Double(tokens[i + 1]),
                  let y = Double(tokens[i + 2]) else { break }
            let pt = CGPoint(x: x, y: y)
            if t == "M" || t == "m" || !started {
                path.move(to: pt)
                started = true
            } else {
                path.addLine(to: pt)
            }
            i += 3
        } else {
            i += 1
        }
    }
    return path
}

// MARK: - Shared chrome

private struct CapsLabel: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .semibold))
            .tracking(1.2)
            .foregroundColor(textSecondary)
    }
}

private struct PhotoSlot: View {
    let image: UIImage?
    let label: String
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(cardFill)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                VStack(spacing: 4) {
                    Image(systemName: "camera")
                        .font(.system(size: 14))
                        .foregroundColor(textSecondary)
                    Text(label)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(textSecondary)
                }
            }
        }
        .aspectRatio(3 / 4, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct AvatarCircle: View {
    let image: UIImage?
    let name: String?
    var size: CGFloat = 36
    var body: some View {
        ZStack {
            Circle().fill(cardFill)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Text(String((name ?? "?").prefix(1)).uppercased())
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundColor(textPrimary)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(canvas, lineWidth: 1.5))
    }
}

// MARK: - Streak & visit (original Orbit widget)

private struct StreakSmallView: View {
    let summary: OrbitSummary
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 20))
                .foregroundColor(flame)
            Spacer(minLength: 0)
            Text("\(summary.currentStreak)")
                .font(.system(size: 40, weight: .bold, design: .serif))
                .foregroundColor(textPrimary)
            Text("day photo streak")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(textSecondary)
            Text(summary.photoStatus)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(summary.mineCheckedIn && summary.partnerCheckedIn ? success : textSecondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct StreakMediumView: View {
    let summary: OrbitSummary
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                CapsLabel(text: "NEXT VISIT")
                if let line = countdown(summary.nextVisitAt) ?? countdown(summary.nextEventAt) {
                    Text(line)
                        .font(.system(size: 26, weight: .bold, design: .serif))
                        .foregroundColor(textPrimary)
                        .minimumScaleFactor(0.6)
                        .lineLimit(2)
                    if summary.nextVisitAt == nil, let title = summary.nextEventTitle {
                        Text(title)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(textSecondary)
                            .lineLimit(1)
                    }
                } else {
                    Text("No upcoming visit")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(textPrimary)
                        .padding(.top, 4)
                }
                Spacer(minLength: 0)
                Text(summary.photoStatus)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(summary.mineCheckedIn && summary.partnerCheckedIn ? success : textSecondary)
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundColor(flame)
                    Text("\(summary.currentStreak)")
                        .font(.system(size: 22, weight: .bold, design: .serif))
                        .foregroundColor(textPrimary)
                }
                Text("photo streak")
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
            StreakMediumView(summary: entry.summary)
        default:
            StreakSmallView(summary: entry.summary)
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
        .configurationDisplayName("Streak & visit")
        .description("Photo streak and countdown to your next visit.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Daily Photo

private struct DailyPhotoView: View {
    @Environment(\.widgetFamily) var family
    let entry: OrbitEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if family == .systemMedium {
                CapsLabel(text: "DAILY PHOTO")
                Text(entry.summary.photoStatus)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(
                        entry.summary.mineCheckedIn && entry.summary.partnerCheckedIn
                            ? accent : textPrimary
                    )
                    .lineLimit(1)
            }
            HStack(spacing: 8) {
                PhotoSlot(image: entry.dailyPhoto, label: "You")
                Image(systemName: "arrow.left.arrow.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(textSecondary)
                PhotoSlot(image: entry.partnerPhoto, label: "Partner")
            }
            .frame(maxWidth: .infinity)
            if family != .systemMedium {
                Text(entry.summary.photoStatus)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(
                        entry.summary.mineCheckedIn && entry.summary.partnerCheckedIn
                            ? accent : textSecondary
                    )
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
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
        .description("Today’s photos from you and your partner.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Drawing

private struct DrawingCanvasView: View {
    let drawing: WidgetDrawing
    var body: some View {
        let w = max(drawing.width, 1)
        let h = max(drawing.height, 1)
        Canvas { ctx, size in
            let scale = min(size.width / w, size.height / h)
            let dx = (size.width - w * scale) / 2
            let dy = (size.height - h * scale) / 2
            var t = CGAffineTransform(translationX: dx, y: dy).scaledBy(x: scale, y: scale)
            for stroke in drawing.strokes {
                var p = svgPath(stroke.path)
                p = p.applying(t)
                ctx.stroke(
                    p,
                    with: .color(colorFromHex(stroke.color)),
                    style: StrokeStyle(lineWidth: stroke.width * scale, lineCap: .round, lineJoin: .round)
                )
            }
        }
        .background(colorFromHex(drawing.background))
    }
}

private struct DrawingView: View {
    let summary: OrbitSummary
    var body: some View {
        if let drawing = summary.latestDrawing, !drawing.strokes.isEmpty {
            DrawingCanvasView(drawing: drawing)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "pencil.tip")
                    .font(.system(size: 22))
                    .foregroundColor(accent)
                Spacer(minLength: 0)
                Text("No drawings yet")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(textPrimary)
                Text("Send one in the app")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
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

// MARK: - Goals

private struct ScoreRing: View {
    let completed: Int
    let total: Int
    var body: some View {
        let progress = total > 0 ? Double(completed) / Double(total) : 0
        ZStack {
            Circle()
                .stroke(textSecondary.opacity(0.25), lineWidth: 7)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(completed)/\(total)")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(textPrimary)
        }
        .frame(width: 64, height: 64)
    }
}

private struct GoalsView: View {
    @Environment(\.widgetFamily) var family
    let goals: [WidgetGoalItem]
    var body: some View {
        let done = goals.filter(\.done).count
        if family == .systemSmall {
            VStack(alignment: .leading, spacing: 6) {
                CapsLabel(text: "THIS WEEK")
                Spacer(minLength: 0)
                if goals.isEmpty {
                    Text("Set goals")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(textPrimary)
                    Text("None yet this week")
                        .font(.system(size: 11))
                        .foregroundColor(textSecondary)
                } else {
                    HStack {
                        Spacer()
                        ScoreRing(completed: done, total: goals.count)
                        Spacer()
                    }
                    Text("\(done) of \(goals.count) done")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textSecondary)
                        .frame(maxWidth: .infinity)
                }
                Spacer(minLength: 0)
            }
        } else {
            VStack(alignment: .leading, spacing: 4) {
                CapsLabel(text: "THIS WEEK")
                Text("Connection goals")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(textPrimary)
                    .padding(.bottom, 4)
                if goals.isEmpty {
                    Text("None yet this week")
                        .font(.system(size: 13))
                        .foregroundColor(textSecondary)
                    Spacer(minLength: 0)
                } else {
                    ForEach(Array(goals.prefix(5).enumerated()), id: \.offset) { _, goal in
                        HStack(spacing: 6) {
                            Image(systemName: goal.done ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 13))
                                .foregroundColor(goal.done ? success : textSecondary.opacity(0.55))
                            Text(goal.text)
                                .font(.system(size: 13, weight: .medium))
                                .strikethrough(goal.done)
                                .foregroundColor(goal.done ? textSecondary : textPrimary)
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                    Text("\(done)/\(goals.count) done")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(textSecondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
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
        .description("This week’s connection goals.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Their World

private func weatherSymbol(_ summary: String?) -> String {
    guard let s = summary?.lowercased() else { return "thermometer" }
    if s.contains("clear") { return "sun.max.fill" }
    if s.contains("cloud") { return "cloud.fill" }
    if s.contains("rain") { return "cloud.rain.fill" }
    if s.contains("snow") { return "cloud.snow.fill" }
    if s.contains("storm") { return "cloud.bolt.fill" }
    return "cloud.sun.fill"
}

private struct BatteryBar: View {
    let percent: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(textSecondary.opacity(0.25))
                    Capsule()
                        .fill(percent < 20 ? accent : success)
                        .frame(width: geo.size.width * CGFloat(min(max(percent, 0), 100)) / 100)
                }
            }
            .frame(height: 8)
            Text("\(percent)%")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(textPrimary)
        }
    }
}

private struct TheirWorldSmallView: View {
    let entry: OrbitEntry
    var body: some View {
        let s = entry.summary
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                AvatarCircle(image: entry.partnerAvatar, name: s.partnerName, size: 28)
                Spacer(minLength: 0)
            }
            Spacer(minLength: 0)
            Text(s.partnerName ?? "Partner")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(textPrimary)
                .lineLimit(1)
            if let city = s.partnerCity {
                Text(city)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(textSecondary)
                    .lineLimit(1)
            }
            HStack(spacing: 4) {
                Image(systemName: weatherSymbol(s.weatherSummary))
                    .font(.system(size: 11))
                if let temp = s.temperatureF {
                    Text("\(s.weatherSummary ?? "Weather") · \(temp)°F")
                } else {
                    Text(s.weatherSummary ?? s.localTime ?? "")
                }
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(textSecondary)
            .lineLimit(1)
            if let bat = s.batteryPercent {
                Text("Battery \(bat)%")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(bat < 20 ? accent : textSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct TheirWorldMediumView: View {
    let entry: OrbitEntry
    var body: some View {
        let s = entry.summary
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    CapsLabel(text: "THEIR WORLD")
                    Text(s.partnerName ?? "Partner")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(textPrimary)
                        .lineLimit(1)
                }
                Spacer()
                AvatarCircle(image: entry.partnerAvatar, name: s.partnerName, size: 40)
            }
            Rectangle().fill(textSecondary.opacity(0.25)).frame(height: 1)
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    CapsLabel(text: "LOCAL TIME")
                    Text(s.localTime ?? "—")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(textPrimary)
                    Text([s.timezone, s.partnerCity].compactMap { $0 }.joined(separator: " · "))
                        .font(.system(size: 10))
                        .foregroundColor(textSecondary)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 2) {
                    CapsLabel(text: "WEATHER")
                    HStack(spacing: 4) {
                        Image(systemName: weatherSymbol(s.weatherSummary))
                            .font(.system(size: 12))
                            .foregroundColor(textPrimary)
                        if let temp = s.temperatureF {
                            Text("\(s.weatherSummary ?? "—") · \(temp)°F")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(textPrimary)
                                .lineLimit(1)
                        } else {
                            Text(s.weatherSummary ?? "—")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(textPrimary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    CapsLabel(text: "STATUS")
                    Text(s.statusMessage ?? "No status set")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(textPrimary)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .leading, spacing: 2) {
                    CapsLabel(text: "BATTERY")
                    if let bat = s.batteryPercent {
                        BatteryBar(percent: bat)
                    } else {
                        Text("—")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(textSecondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct TheirWorldWidget: Widget {
    let kind: String = "TheirWorldWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TheirWorldRoot(entry: entry)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Their World")
        .description("Partner time, weather, status, and battery.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct TheirWorldRoot: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry
    var body: some View {
        switch family {
        case .systemMedium:
            TheirWorldMediumView(entry: entry)
        default:
            TheirWorldSmallView(entry: entry)
        }
    }
}

// MARK: - Distance

private struct DistanceSmallView: View {
    let summary: OrbitSummary
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            CapsLabel(text: "DISTANCE APART")
            Spacer(minLength: 0)
            if let miles = summary.distanceMiles {
                Text(miles.formatted(.number.precision(.fractionLength(0))))
                    .font(.system(size: 34, weight: .bold, design: .serif))
                    .foregroundColor(textPrimary)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.system(size: 10))
                    Text("mi apart")
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(textSecondary)
            } else {
                Text("Distance")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(textPrimary)
                Text("Location not shared")
                    .font(.system(size: 12))
                    .foregroundColor(textSecondary)
            }
            Spacer(minLength: 0)
            HStack {
                Text(summary.myCity ?? "—")
                    .lineLimit(1)
                Spacer()
                Text(summary.partnerCity ?? "—")
                    .lineLimit(1)
            }
            .font(.system(size: 11, weight: .medium))
            .foregroundColor(textPrimary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct DistanceMapLite: View {
    let me: CLLocationCoordinate2D
    let partner: CLLocationCoordinate2D

    var region: MKCoordinateRegion {
        let mid = CLLocationCoordinate2D(
            latitude: (me.latitude + partner.latitude) / 2,
            longitude: (me.longitude + partner.longitude) / 2
        )
        let latDelta = max(abs(me.latitude - partner.latitude) * 1.8, 8)
        let lonDelta = max(abs(me.longitude - partner.longitude) * 1.8, 8)
        return MKCoordinateRegion(center: mid, span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lonDelta))
    }

    var body: some View {
        Map(initialPosition: .region(region)) {
            Marker("", coordinate: me)
            Marker("", coordinate: partner)
            MapPolyline(coordinates: [me, partner])
                .stroke(accent, style: StrokeStyle(lineWidth: 2, dash: [5, 5]))
        }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .disabled(true)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct DistanceMediumView: View {
    let entry: OrbitEntry
    var body: some View {
        let s = entry.summary
        HStack(alignment: .top, spacing: 12) {
            if let la = s.myLat, let lo = s.myLon, let pla = s.partnerLat, let plo = s.partnerLon {
                DistanceMapLite(
                    me: CLLocationCoordinate2D(latitude: la, longitude: lo),
                    partner: CLLocationCoordinate2D(latitude: pla, longitude: plo)
                )
                .frame(width: 120)
            }
            VStack(alignment: .leading, spacing: 2) {
                CapsLabel(text: "DISTANCE APART")
                if let miles = s.distanceMiles {
                    Text(miles.formatted(.number.precision(.fractionLength(0))))
                        .font(.system(size: 32, weight: .bold, design: .serif))
                        .foregroundColor(textPrimary)
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 10))
                        Text("mi apart")
                    }
                    .font(.system(size: 12))
                    .foregroundColor(textSecondary)
                } else {
                    Text("Not shared")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(textPrimary)
                }
                Spacer(minLength: 4)
                VStack(alignment: .leading, spacing: 6) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(s.myName ?? "You")
                            .font(.system(size: 10))
                            .foregroundColor(textSecondary)
                        Text(s.myCity ?? "—")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(textPrimary)
                    }
                    VStack(alignment: .leading, spacing: 0) {
                        Text(s.partnerName ?? "Partner")
                            .font(.system(size: 10))
                            .foregroundColor(textSecondary)
                        Text(s.partnerCity ?? "—")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(textPrimary)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct DistanceRoot: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry
    var body: some View {
        switch family {
        case .systemMedium:
            DistanceMediumView(entry: entry)
        default:
            DistanceSmallView(summary: entry.summary)
        }
    }
}

struct DistanceWidget: Widget {
    let kind: String = "DistanceWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DistanceRoot(entry: entry)
                .containerBackground(canvas, for: .widget)
        }
        .configurationDisplayName("Distance Apart")
        .description("How far apart you are right now.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    widget()
} timeline: {
    OrbitEntry(date: .now, summary: OrbitSummary(
        partnerCheckedIn: true, mineCheckedIn: true, currentStreak: 7))
}

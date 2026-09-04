import ExpoModulesCore
import UIKit
import WidgetKit

public class OrbitWidgetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OrbitWidgets")

    // Write a string value into the shared App Group container and refresh
    // the widget timelines so the home-screen widget updates immediately.
    Function("set") { (key: String, value: String, group: String) in
      let defaults = UserDefaults(suiteName: group)
      defaults?.set(value, forKey: key)
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    Function("reload") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    /// Download (or clear) widget image slots into the App Group from the main
    /// app process, which has reliable network access. Keys are slot names
    /// (`daily`, `partner_photo`, `my_avatar`, `partner_avatar`); values are
    /// remote URLs. Pass an empty string to delete a stale slot file.
    AsyncFunction("cacheImages") { (slots: [String: String], group: String) in
      guard let root = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: group
      ) else { return }

      let dir = root.appendingPathComponent("widget-images", isDirectory: true)
      try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

      for (slot, urlString) in slots {
        let fileURL = dir.appendingPathComponent("\(slot).jpg")
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
          try? FileManager.default.removeItem(at: fileURL)
          continue
        }
        guard let url = URL(string: trimmed),
              let data = try? Data(contentsOf: url),
              let image = UIImage(data: data) else { continue }
        let scaled = Self.downscale(image, maxDimension: 400)
        guard let jpeg = scaled.jpegData(compressionQuality: 0.82) else { continue }
        try? jpeg.write(to: fileURL, options: .atomic)
      }

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }

  private static func downscale(_ image: UIImage, maxDimension: CGFloat) -> UIImage {
    let size = image.size
    let longest = max(size.width, size.height)
    guard longest > maxDimension, longest > 0 else { return image }
    let scale = maxDimension / longest
    let newSize = CGSize(width: size.width * scale, height: size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: newSize)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: newSize))
    }
  }
}

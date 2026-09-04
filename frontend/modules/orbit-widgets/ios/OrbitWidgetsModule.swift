import ExpoModulesCore
import UIKit
import WidgetKit

public class OrbitWidgetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OrbitWidgets")

    // Write a string into the shared App Group. Does not reload timelines —
    // callers should finish caching images first, then call reload().
    Function("set") { (key: String, value: String, group: String) in
      let defaults = UserDefaults(suiteName: group)
      defaults?.set(value, forKey: key)
    }

    Function("reload") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    /// Write (or clear) one image slot in the App Group `widget-images/` folder.
    /// Pass an empty `base64Jpeg` to delete a stale file. Otherwise decode JPEG/PNG
    /// base64, downscale, and store as JPEG.
    AsyncFunction("writeImage") { (slot: String, base64Jpeg: String, group: String) in
      guard let root = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: group
      ) else { return }

      let dir = root.appendingPathComponent("widget-images", isDirectory: true)
      try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
      let fileURL = dir.appendingPathComponent("\(slot).jpg")

      let trimmed = base64Jpeg.trimmingCharacters(in: .whitespacesAndNewlines)
      if trimmed.isEmpty {
        try? FileManager.default.removeItem(at: fileURL)
        return
      }

      guard let data = Data(base64Encoded: trimmed, options: .ignoreUnknownCharacters),
            let image = UIImage(data: data) else { return }
      let scaled = Self.downscale(image, maxDimension: 400)
      guard let jpeg = scaled.jpegData(compressionQuality: 0.82) else { return }
      try? jpeg.write(to: fileURL, options: .atomic)
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

import ExpoModulesCore
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
  }
}

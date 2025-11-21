import SwiftUI
import UserNotifications
import UIKit

class NotificationRouter: ObservableObject {
    static let shared = NotificationRouter()
    @Published var targetChannelId: String?
    @Published var targetMessageId: String?
    func route(channelId: String, messageId: String?) {
        targetChannelId = channelId
        targetMessageId = messageId
    }
    func reset() { targetChannelId = nil; targetMessageId = nil }
}

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // Show notifications while app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        let channelId = info["channelId"] as? String
        let messageId = info["messageId"] as? String
        if let cid = channelId, !cid.isEmpty {
            NotificationRouter.shared.route(channelId: cid, messageId: messageId)
        }
        completionHandler()
    }
}

@main
struct HolaMundoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

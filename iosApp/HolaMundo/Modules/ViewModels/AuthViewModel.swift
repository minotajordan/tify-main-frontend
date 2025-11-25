//
//  AuthViewModel.swift
//  HolaMundo
//
//  Created by MINOTA Jordan on 25/11/25.
//

import SwiftUI

class AuthViewModel: ObservableObject {
    @Published var phone: String = ""
    @Published var code: String = ""
    @Published var stage: Int = 1
    @Published var sending: Bool = false
    @Published var info: String? = nil
    @Published var error: String? = nil
    @Published var resendCooldown: Int = 0
    @Published var activeCodeIndex: Int = 0

    func requestCode(dialCode: String) {
        guard !phone.isEmpty else { return }
        let uid = UserSession.shared.currentUserId
        guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/request-verification-code") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let digits = phone.filter { $0.isNumber }
        let body: [String: Any] = ["phoneNumber": dialCode + digits]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        sending = true
        URLSession.shared.dataTask(with: req) { [weak self] _, _, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.sending = false
                self.stage = 2
                self.info = "Te enviamos un código de verificación."
                self.resendCooldown = 300
                Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
                    self.resendCooldown = max(0, self.resendCooldown - 1)
                    if self.resendCooldown == 0 { t.invalidate() }
                }
            }
        }.resume()
    }

    func verifyCode(dialCode: String, onSuccess: (() -> Void)? = nil) {
        guard !phone.isEmpty, !code.isEmpty else { return }
        let uid = UserSession.shared.currentUserId
        guard !uid.isEmpty, let url = URL(string: "\(APIConfig.baseURL)/users/\(uid)/register") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let digits = phone.filter { $0.isNumber }
        let body: [String: Any] = ["phoneNumber": dialCode + digits, "code": code]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        sending = true
        URLSession.shared.dataTask(with: req) { [weak self] data, response, _ in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.sending = false
                if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                   let data = data,
                   let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let token = obj["token"] as? String {
                    UserDefaults.standard.set(token, forKey: "auth_token")
                    UserDefaults.standard.set(true, forKey: "user_is_verified")
                    UserSession.shared.token = token
                    UserSession.shared.isVerified = true
                    onSuccess?()
                } else {
                    self.error = "Código inválido. Intenta nuevamente."
                }
            }
        }.resume()
    }
}

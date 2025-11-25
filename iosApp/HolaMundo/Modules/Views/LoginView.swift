//
//  LoginView.swift
//  HolaMundo
//
//  Created by MINOTA Jordan on 25/11/25.
//

import SwiftUI
import UIKit

struct LoginView: View {
    var onSuccess: (() -> Void)? = nil
    @Environment(\.dismiss) var dismiss
    @StateObject private var vm = AuthViewModel()
    @FocusState private var phoneFocused: Bool
    @FocusState private var codeFocused: Bool
    struct Country: Identifiable, Equatable, Hashable {
        let id = UUID()
        let name: String
        let iso: String
        let dialCode: String
        var flag: String {
            let base = 127397
            return iso.uppercased().unicodeScalars.reduce("") { $0 + String(UnicodeScalar(base + Int($1.value))!) }
        }
    }
    let countries: [Country] = [
        Country(name: "Colombia", iso: "CO", dialCode: "+57"),
        Country(name: "Venezuela", iso: "VE", dialCode: "+58"),
        Country(name: "Ecuador", iso: "EC", dialCode: "+593"),
        Country(name: "Perú", iso: "PE", dialCode: "+51"),
        Country(name: "México", iso: "MX", dialCode: "+52"),
        Country(name: "Bolivia", iso: "BO", dialCode: "+591")
    ]
    @State private var selectedCountry: Country = {
        let rc = Locale.current.regionCode ?? "MX"
        let list = [
            Country(name: "Colombia", iso: "CO", dialCode: "+57"),
            Country(name: "Venezuela", iso: "VE", dialCode: "+58"),
            Country(name: "Ecuador", iso: "EC", dialCode: "+593"),
            Country(name: "Perú", iso: "PE", dialCode: "+51"),
            Country(name: "México", iso: "MX", dialCode: "+52"),
            Country(name: "Bolivia", iso: "BO", dialCode: "+591")
        ]
        return list.first(where: { $0.iso == rc }) ?? list.first!
    }()

    var body: some View {
        NavigationView {
            VStack(spacing: 16) {
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.check").font(.system(size: 48)).foregroundColor(.blue)
                    Text("Inicia sesión").font(.title3).fontWeight(.semibold)
                    Text("Ingresa tu número de teléfono y el código de verificación").font(.footnote).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal)
                }
                Form {
                    Section("Número de teléfono") {
                        HStack(spacing: 10) {
                            Menu {
                                ForEach(countries) { c in
                                    Button(action: { selectedCountry = c }) {
                                        HStack { Text(c.flag); Text(c.name); Spacer(); Text(c.dialCode).foregroundColor(.secondary) }
                                    }
                                }
                            } label: {
                                HStack(spacing: 6) {
                                    Text(selectedCountry.flag)
                                    Text(selectedCountry.dialCode).font(.subheadline).foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)
                            }
                            ZStack {
                                RoundedRectangle(cornerRadius: 8).fill(Color(.systemGray6))
                                HStack {
                                    TextField("300 000 0000", text: $vm.phone)
                                        .keyboardType(.numberPad)
                                        .textContentType(.telephoneNumber)
                                        .focused($phoneFocused)
                                        .onChange(of: vm.phone) { v in vm.phone = v.filter { $0.isNumber } }
                                    Button(action: {
                                        let text = UIPasteboard.general.string ?? ""
                                        let digits = text.filter { $0.isNumber }
                                        if !digits.isEmpty { vm.phone = digits; phoneFocused = true }
                                    }) {
                                        Image(systemName: "doc.on.clipboard").imageScale(.small).foregroundColor(.secondary)
                                    }
                                    if !vm.phone.isEmpty {
                                        Button(action: { vm.phone = "" }) { Image(systemName: "xmark.circle.fill").foregroundColor(.secondary) }
                                    }
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 8)
                                .contextMenu {
                                    Button {
                                        let text = UIPasteboard.general.string ?? ""
                                        let digits = text.filter { $0.isNumber }
                                        if !digits.isEmpty { vm.phone = digits; phoneFocused = true }
                                    } label: { Label("Pegar", systemImage: "doc.on.clipboard") }
                                }
                            }
                        }
                        .contentShape(Rectangle())
                        .highPriorityGesture(TapGesture().onEnded { phoneFocused = true })
                    }
                    if vm.stage == 1 {
                        Button(action: { vm.requestCode(dialCode: selectedCountry.dialCode) }) {
                            HStack { if vm.sending { ProgressView() }; Image(systemName: "paperplane.fill"); Text("Enviar código").fontWeight(.semibold) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.blue)
                        .frame(maxWidth: .infinity)
                        .disabled(vm.phone.isEmpty || vm.sending)
                    } else {
                        Section("Código") {
                            if let info = vm.info { Text(info).font(.footnote).foregroundColor(.secondary) }
                            ZStack {
                                HStack(spacing: 8) {
                                    ForEach(0..<6, id: \.self) { i in
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 8).stroke(i == vm.code.count ? Color.blue : Color.gray.opacity(0.3), lineWidth: 1).frame(width: 44, height: 52)
                                            Text(i < vm.code.count ? String(vm.code[vm.code.index(vm.code.startIndex, offsetBy: i)]) : "").font(.title3)
                                        }
                                        .scaleEffect(vm.activeCodeIndex == i ? 1.08 : 1.0)
                                        .animation(.spring(response: 0.22, dampingFraction: 0.8), value: vm.activeCodeIndex)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .center)
                                .contentShape(Rectangle())
                                .onTapGesture { codeFocused = true }
                                .simultaneousGesture(LongPressGesture(minimumDuration: 0.5).onEnded { _ in codeFocused = true })
                                .contextMenu {
                                    Button {
                                        let text = UIPasteboard.general.string ?? ""
                                        let clean = String(text.filter { $0.isNumber }.prefix(6))
                                        if !clean.isEmpty {
                                            vm.code = clean
                                            withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) { vm.activeCodeIndex = min(clean.count, 5) }
                                        }
                                    } label: { Label("Pegar", systemImage: "doc.on.clipboard") }
                                }
                                TextField("", text: $vm.code)
                                    .keyboardType(.numberPad)
                                    .textContentType(.oneTimeCode)
                                    .focused($codeFocused)
                                    .onChange(of: vm.code) { v in
                                        let clean = String(v.filter { $0.isNumber }.prefix(6))
                                        vm.code = clean
                                        withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) { vm.activeCodeIndex = min(clean.count, 5) }
                                    }
                                    .frame(width: 1, height: 1)
                                    .opacity(0.01)
                            }
                            if let e = vm.error { Text(e).foregroundColor(.red) }
                            Button(action: { vm.verifyCode(dialCode: selectedCountry.dialCode, onSuccess: onSuccess) }) {
                                HStack { if vm.sending { ProgressView() }; Image(systemName: "checkmark.seal.fill"); Text("Verificar").fontWeight(.semibold) }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(.green)
                            .frame(maxWidth: .infinity)
                            .disabled(vm.code.count < 6 || vm.sending)
                            HStack {
                                Button(action: { if vm.resendCooldown == 0 { vm.requestCode(dialCode: selectedCountry.dialCode) } }) { Label(vm.resendCooldown == 0 ? "Reenviar código" : "Reenviar en \(vm.resendCooldown)s", systemImage: "clock") }
                                .disabled(vm.resendCooldown > 0)
                                Spacer()
                                Button(action: {
                                    let text = UIPasteboard.general.string ?? ""
                                    let clean = String(text.filter { $0.isNumber }.prefix(6))
                                    if !clean.isEmpty { vm.code = clean; withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) { vm.activeCodeIndex = min(clean.count, 5) } }
                                }) {
                                    HStack(spacing: 4) { Image(systemName: "doc.on.clipboard").imageScale(.small).foregroundColor(.secondary); Text("Pegar código").foregroundColor(.secondary) }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Iniciar sesión")
            .toolbar { ToolbarItem(placement: .navigationBarLeading) { Button("Cerrar") { dismiss() } } }
            .simultaneousGesture(TapGesture().onEnded { phoneFocused = false; codeFocused = false; UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) })
        }
    }
}

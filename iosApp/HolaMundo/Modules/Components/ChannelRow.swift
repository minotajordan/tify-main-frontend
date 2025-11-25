//
//  ChannelRow.swift
//  HolaMundo
//
//  Created by MINOTA Jordan on 25/11/25.
//

import SwiftUI

struct ChannelRow: View {
    let channel: Channel
    let subtitle: String?
    let iconColor: Color
    let onTap: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: channel.icon)
                .foregroundColor(iconColor)
            VStack(alignment: .leading, spacing: 4) {
                Text(channel.title)
                    .font(.subheadline)
                if let s = subtitle {
                    Text(s)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            Spacer()
        }
        .contentShape(Rectangle())
        .onTapGesture { onTap() }
    }
}

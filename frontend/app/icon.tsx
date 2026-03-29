// prepwise/app/icon.tsx
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
    const BAR_HEIGHTS = [0.45, 0.75, 1, 0.65, 0.85]
    const barW = 4
    const gap = 3
    const totalW = BAR_HEIGHTS.length * (barW + gap) - gap
    const startX = (32 - totalW) / 2

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={32}
            height={32}
            viewBox="0 0 32 32"
        >
            <rect width="32" height="32" rx="6" fill="#0e0e0e" />
            {BAR_HEIGHTS.map((h, i) => {
                const barH = 20 * h
                const x = startX + i * (barW + gap)
                const y = 6 + (20 - barH)
                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={2}
                        fill="#d4fe42"
                    />
                )
            })}
        </svg>
    )
}
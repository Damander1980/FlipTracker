import { useEffect, useState } from "react";

export default function CoinRain({ trigger, roi }) {
  const [coins, setCoins] = useState([]);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!trigger) return;

    if (roi >= 50) setMessage("🤑 JACKPOT!");
    else if (roi >= 20) setMessage("🪙 GREAT FIND!");
    else return;

    const newCoins = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 1,
      size: 20 + Math.random() * 20,
      emoji: roi >= 50 ? "💰" : "🪙",
    }));

    setCoins(newCoins);
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }, [trigger, roi]);

  if (!visible) return null;

  return (
    <div className="coin-rain-overlay">
      <div className="coin-rain-message">{message}</div>
      {coins.map(coin => (
        <div
          key={coin.id}
          className="coin"
          style={{
            left: `${coin.left}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
            fontSize: `${coin.size}px`,
          }}
        >
          {coin.emoji}
        </div>
      ))}
    </div>
  );
}

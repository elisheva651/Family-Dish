import './FloatingButton.css'

export default function FloatingButton({ onClick }) {
  return (
    <button className="floating-button" onClick={onClick}>
      +
    </button>
  )
}

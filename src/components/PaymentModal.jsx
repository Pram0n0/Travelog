import { useState, useEffect } from 'react'
import './PaymentModal.css'

function PaymentModal({ isOpen, onClose, onConfirm, maxAmount, currency, recipientName }) {
  const [amount, setAmount] = useState(maxAmount)
  const [isManualInput, setIsManualInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset amount when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(maxAmount)
      setIsManualInput(false)
      setIsSubmitting(false)
    }
  }, [isOpen, maxAmount])

  if (!isOpen) return null

  const handleSliderChange = (e) => {
    setAmount(parseFloat(e.target.value))
  }

  const handleManualInputChange = (e) => {
    const value = e.target.value
    // Allow empty string for clearing
    if (value === '') {
      setAmount('')
      return
    }
    // Only allow valid numbers
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxAmount) {
      setAmount(numValue)
    }
  }

  const handleAmountClick = () => {
    setIsManualInput(true)
  }

  const handleConfirm = async () => {
    if (amount <= 0 || amount > maxAmount) {
      alert(`Please enter an amount between ${currency} 0.01 and ${currency} ${maxAmount.toFixed(2)}`)
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(amount)
      onClose()
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Failed to create payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💸 Pay Back</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          <p className="payment-info">
            Paying <strong>{recipientName}</strong>
          </p>
          <p className="payment-max">
            Maximum: {currency} {maxAmount.toFixed(2)}
          </p>

          <div 
            className="amount-display" 
            onClick={handleAmountClick}
            title="Click to edit amount"
          >
            <span className="currency-symbol">{currency}</span>
            {isManualInput ? (
              <input
                type="number"
                min="0"
                max={maxAmount}
                step="0.01"
                value={amount}
                onChange={handleManualInputChange}
                className="amount-input-direct"
                autoFocus
                onBlur={() => {
                  setIsManualInput(false)
                  // If empty, set to 0
                  if (amount === '' || amount === 0) {
                    setAmount(0)
                  }
                }}
              />
            ) : (
              <span className="amount-value">{typeof amount === 'number' ? amount.toFixed(2) : '0.00'}</span>
            )}
          </div>

          {!isManualInput && (
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max={maxAmount}
                step="0.01"
                value={amount}
                onChange={handleSliderChange}
                className="payment-slider"
              />
              <div className="slider-labels">
                <span>0</span>
                <span>{maxAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="payment-note">
            <p>⏳ This payment will be pending until <strong>{recipientName}</strong> confirms it.</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={isSubmitting || amount <= 0}
          >
            {isSubmitting ? 'Creating...' : `Confirm Payment`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal

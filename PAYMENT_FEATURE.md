# Payment / Settlement Feature

## Overview
Added a peer-to-peer payment system where users can settle debts directly from the Individual Balances section. Payments require confirmation from the recipient before being recorded as settlement expenses.

## User Flow

### 1. Initiating a Payment
- **Location**: Individual Balances section (non-settlement view)
- **Trigger**: Click "Pay" button next to any debt you owe
- **Action**: Opens payment modal with slider and manual input

### 2. Payment Modal
- **Slider**: Drag to select amount (0 to max debt)
- **Manual Input**: Click "Enter amount manually" to type exact amount
- **Currency**: Automatically set to the debt's currency
- **Max Amount**: Cannot exceed the owed amount
- **Confirm**: Creates pending payment

### 3. Pending Payments
- **Sender View**: "Waiting for [recipient] to confirm"
- **Recipient View**: Shows payment with Accept/Reject buttons
- **Status**: Displayed in yellow/blue section above individual balances

### 4. Payment Confirmation
- **Accept**: Creates settlement expense, updates balances automatically
- **Reject**: Removes pending payment, no expense created
- **Settlement Expense**: Logged with description "Settlement: [sender] paid [recipient]"

## Implementation Details

### Backend (Node.js/Express)

#### Database Schema (`server/models/Group.js`)
```javascript
paymentSchema:
  - id: String (unique identifier)
  - from: String (payer username)
  - to: String (recipient username)
  - amount: Number
  - currency: String
  - status: 'pending' | 'confirmed' | 'rejected'
  - createdAt: Date
  - confirmedAt: Date (optional)
  - rejectedAt: Date (optional)

expenseSchema additions:
  - isSettlement: Boolean (marks settlement expenses)
  - settledPaymentId: String (references payment)
```

#### API Endpoints (`server/routes/groups.js`)

**POST /api/groups/:groupId/payments**
- Creates a new pending payment
- Validates: sender and recipient are members, amount > 0
- Returns updated group with new payment

**PUT /api/groups/:groupId/payments/:paymentId**
- Body: `{ action: 'confirm' | 'reject' }`
- Only recipient can confirm/reject
- On confirm: Creates settlement expense, marks payment confirmed
- On reject: Marks payment rejected
- Returns updated group

### Frontend (React)

#### New Components

**PaymentModal.jsx**
- Modal dialog for payment creation
- Props: `isOpen`, `onClose`, `onConfirm`, `maxAmount`, `currency`, `recipientName`
- Features:
  - Animated slider (0 to max)
  - Toggle between slider and manual input
  - Real-time amount display
  - Validation (amount must be > 0 and <= max)
  - Loading state during submission

**PaymentModal.css**
- Gradient background for amount display
- Smooth slider animations
- Responsive design
- Hover effects on buttons

#### Modified Components

**BalanceCalculator.jsx**
- Added payment state management
- Shows "Pay" buttons for debts user owes
- Displays pending payments section
- Accept/Reject buttons for incoming payments
- Props added: `groupId`, `onPaymentAction`, `pendingPayments`

**ExpenseTracker.jsx**
- Added `handlePaymentAction` function
- Passes payment props to BalanceCalculator
- Integrates with groupsAPI for payment operations
- Props added: `onGroupUpdate`

**App.jsx**
- Added `updateGroup` function for real-time updates
- Passes to ExpenseTracker via GroupPage

**BalanceCalculator.css**
- Styles for payment buttons
- Pending payments section styling
- Accept/Reject button styling

#### API Integration (`src/api/index.js`)
```javascript
groupsAPI.createPayment(groupId, { to, amount, currency })
groupsAPI.confirmPayment(groupId, paymentId, action)
```

## Features

### Smart Amount Handling
- Slider defaults to full amount owed
- Can pay partial amounts
- Manual input for precise amounts
- Validation prevents overpayment

### Status Tracking
- Pending: Yellow/blue highlight with clock emoji ⏳
- Sender sees waiting message
- Recipient sees action buttons
- Confirmed: Creates expense, removes from pending
- Rejected: Simply removed, no record

### Balance Integration
- Settlement expenses are marked with `isSettlement: true`
- Automatically updates balances when confirmed
- Included in all balance calculations
- Logged in expense history with special description

### Currency Support
- Respects debt currency
- Shows currency symbol in modal
- Groups pending payments by currency
- Settlement expense uses same currency

## User Experience

### Visual Feedback
- Gradient modal with large amount display
- Smooth slider animations
- Disabled state during processing
- Success/error messages
- Clear pending payment indicators

### Error Handling
- Backend validation (member check, amount validation)
- Frontend validation (max amount, min amount)
- Try-catch with user-friendly error messages
- Processing state prevents double-submission

### Accessibility
- Keyboard navigation support
- Clear button labels
- High contrast payment status indicators
- Descriptive settlement expense names

## Testing Checklist

- [ ] Create payment from Individual Balances
- [ ] Slider functionality (drag, click)
- [ ] Manual input (type amount, validation)
- [ ] Pending payment displays for sender
- [ ] Pending payment displays for recipient
- [ ] Accept payment creates expense
- [ ] Reject payment removes it
- [ ] Balances update correctly after confirmation
- [ ] Settlement expenses appear in history
- [ ] Multiple currencies handled correctly
- [ ] Partial payment functionality
- [ ] Full payment clears debt
- [ ] Cannot overpay
- [ ] Cannot pay negative amounts
- [ ] Loading states work correctly
- [ ] Error messages display properly

## Future Enhancements

1. **Payment History**: Separate tab for all confirmed/rejected payments
2. **Payment Notes**: Optional message with payment
3. **Bulk Payments**: Pay multiple people at once
4. **Recurring Settlements**: Schedule automatic payments
5. **Payment Reminders**: Notify users of pending requests
6. **Payment Analytics**: Track settlement patterns
7. **External Payments**: Integration with payment platforms
8. **Split Payment**: Pay debt from multiple payers
9. **Payment Installments**: Set up payment plans
10. **QR Code Payments**: Generate payment request QR codes

## Known Limitations

1. Settlement expenses cannot be edited (by design)
2. Cannot cancel pending payment once sent (recipient must reject)
3. No payment deadline/expiry
4. No payment priority system
5. Single currency per payment (matches debt currency)

## Security Considerations

- Only authenticated users can create payments
- Only group members can be payment participants
- Only recipient can confirm/reject payments
- Payments validated on backend
- Amount validation prevents manipulation
- Settlement expenses marked immutable

## Performance

- Real-time updates when payment status changes
- Optimistic UI updates (immediate feedback)
- Efficient re-rendering with React state management
- Pending payments filter cached with useMemo
- API calls debounced during processing

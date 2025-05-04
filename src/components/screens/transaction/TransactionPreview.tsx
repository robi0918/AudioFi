import React, { useState, useEffect, useContext } from 'react'
import { ActionButtons } from '@/components/screen-ui/buttons'
import { TransactionDetailCard } from '@/components/screen-ui/cards'
import { LoadingScreen } from '@/components/screen-ui/feedback'
import { CommonContainerPanel } from '@/components/screen-ui/layout'
import { BottomNavigation, HeaderNavigation } from '@/components/screen-ui/navigation'
import { useConfig, useScreenManager, usePaymasterContext } from '@/hooks'
import { TransactionPreviewProps, screens } from '@/types'
import { SendContext } from '@/contexts'

const TransactionPreview: React.FC<TransactionPreviewProps> = ({
  from,
  to,
  networkFee,
  gasTokenSymbol,
  onClose,
  onConfirm,
  onReset,
  children,
  title = 'Send Detail',
}) => {
  const { navigateTo } = useScreenManager()
  const { networkType } = useConfig()
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [userOpResult, setUserOpResult] = useState(false)

  const { isTransferEnabled } = useContext(SendContext)!
  const { clearToken, selectedMode, isPaymentSelected } = usePaymasterContext()
  const isTransferReady =
    isTransferEnabled && selectedMode?.value !== undefined && isPaymentSelected

  // ガス計算中かどうかを判定
  const isCalculatingGas = networkFee === 'Calculating...'

  useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => {
        setCompleted(false)
        if (onReset) onReset()
        navigateTo(screens.ACTIVITY)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [completed, navigateTo, onReset])

  const handleConfirm = async () => {
    if (!onConfirm) return

    try {
      setLoading(true)
      const result = await onConfirm()
      setUserOpResult(result)
      setLoading(false)
      setCompleted(true)
    } catch (err) {
      setUserOpResult(false)
      setLoading(false)
      setCompleted(true)
    }
  }

  return (
    <CommonContainerPanel footer={<BottomNavigation />}>
      <HeaderNavigation />
      <div className='mx-auto relative px-6'>
        <div className='flex flex-col flex-grow'>
          <div className='w-full h-[530px] bg-white rounded-md border border-border-primary items-center justify-center p-3 mt-2 relative'>
            <h2 className='text-xl text-center text-text-secondary mb-3'>{title}</h2>
            <TransactionDetailCard
              from={from}
              to={to}
              networkFee={networkFee}
              gasTokenSymbol={gasTokenSymbol}
              networkType={networkType}
              title={title}
            >
              {children}
            </TransactionDetailCard>
            <ActionButtons
              onCancel={onClose}
              onConfirm={handleConfirm}
              confirmDisabled={!isTransferReady}
              nextLabel={
                loading ? 'Processing...' : isCalculatingGas ? 'Calculating Gas...' : 'Confirm'
              }
              isNextDisabled={loading || completed || isCalculatingGas}
            />
          </div>
        </div>
      </div>
      {(loading || completed) && (
        <LoadingScreen
          message='Processing transaction'
          isCompleted={completed}
          userOpResult={userOpResult}
        />
      )}
    </CommonContainerPanel>
  )
}

export default TransactionPreview

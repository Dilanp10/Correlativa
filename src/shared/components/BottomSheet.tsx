import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-1/2 w-full max-w-md z-50 bg-bg-surface rounded-t-2xl max-h-[88vh] flex flex-col"
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex flex-col items-center pt-3 pb-2 px-5 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted mb-3" />
              <div className="w-full flex items-center justify-between">
                {title ? (
                  <h3 className="text-base font-semibold text-text-primary">{title}</h3>
                ) : (
                  <span />
                )}
                <button
                  onClick={onClose}
                  className="text-text-secondary hover:text-text-primary transition-colors p-1 ml-auto"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="border-b border-muted/30 shrink-0" />
            <div className="overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

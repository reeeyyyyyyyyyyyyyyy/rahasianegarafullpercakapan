import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Modals
  showModeMenu: false,
  showConfirmDialog: false,
  showPinModal: false,
  showTrayEditModal: false,
  showTableSelectModal: false,
  
  // Confirm dialog props
  confirmTitle: '',
  confirmMessage: '',
  confirmOnConfirm: null,
  confirmOnCancel: null,
  
  // PIN modal props
  pinCallback: null,
  pinTitle: 'Enter PIN',
  
  // Tray edit modal
  editingTray: null,
  
  // Delivery overlay
  showDeliveryOverlay: false,
  deliveryOverlayTitle: 'Delivery in Progress',
  deliveryOverlaySubtitle: 'Tifa is running the delivery mission',
  
  // Thank You overlay
  showThankYou: false,
  thankYouMessage: 'Your delivery is on the way!',
  
  // Toast
  toasts: [],
  
  // Actions
  openModeMenu: () => set({ showModeMenu: true }),
  closeModeMenu: () => set({ showModeMenu: false }),
  
  openConfirmDialog: (title, message, onConfirm, onCancel = null) => set({
    showConfirmDialog: true,
    confirmTitle: title,
    confirmMessage: message,
    confirmOnConfirm: onConfirm,
    confirmOnCancel: onCancel,
  }),
  closeConfirmDialog: () => set({
    showConfirmDialog: false,
    confirmTitle: '',
    confirmMessage: '',
    confirmOnConfirm: null,
    confirmOnCancel: null,
  }),
  
  openPinModal: (callback, title = 'Enter PIN') => set({
    showPinModal: true,
    pinCallback: callback,
    pinTitle: title,
  }),
  closePinModal: () => set({
    showPinModal: false,
    pinCallback: null,
  }),
  
  openTrayEditModal: (tray) => set({
    showTrayEditModal: true,
    editingTray: tray,
  }),
  closeTrayEditModal: () => set({
    showTrayEditModal: false,
    editingTray: null,
  }),
  
  openTableSelectModal: () => set({ showTableSelectModal: true }),
  closeTableSelectModal: () => set({ showTableSelectModal: false }),
  
  showDeliveryInProgress: (title = 'Delivery in Progress', subtitle = 'Tifa is running the delivery mission') => set({ 
    showDeliveryOverlay: true,
    deliveryOverlayTitle: title,
    deliveryOverlaySubtitle: subtitle,
  }),
  hideDeliveryInProgress: () => set({ showDeliveryOverlay: false }),
  
  // Thank You overlay actions
  showThankYouOverlay: (message = 'Your delivery is on the way!') => set({ 
    showThankYou: true,
    thankYouMessage: message,
  }),
  hideThankYou: () => set({ showThankYou: false }),
  
  addToast: (toast) => set((state) => {
    // Generate unique ID using timestamp + random number
    const id = Date.now() + Math.random();
    const newToast = { id, duration: 5000, ...toast };
    
    // Limit to maximum 5 toasts at once
    const updatedToasts = [...state.toasts, newToast];
    if (updatedToasts.length > 5) {
      updatedToasts.shift(); // Remove oldest toast
    }
    
    return { toasts: updatedToasts };
  }),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id),
  })),
}));
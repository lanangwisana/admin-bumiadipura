import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, FileCheck, Filter, CheckCircle, Clock, AlertCircle, Eye, X, Loader2, ChevronLeft, ChevronRight, Upload, Trash2, RefreshCcw } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, getDoc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../../config';

// Image compression utility (same as warga app)
const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', quality);
                const sizeKB = (base64.length * 0.75) / 1024;
                if (sizeKB > 500) {
                    const reducedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                    resolve(reducedBase64);
                } else {
                    resolve(base64);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

// Resolution Modal Component - For completing reports
const ResolutionModal = ({ report, onClose, onSubmit, user }) => {
  const [note, setNote] = useState('');
  const [images, setImages] = useState([]); // { preview, base64 }
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_IMAGES = 5;

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (images.length >= MAX_IMAGES) {
      alert(`Maksimal ${MAX_IMAGES} gambar`);
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar (JPG, PNG)');
      return;
    }
    
    setIsCompressing(true);
    try {
      const base64 = await compressImage(file);
      setImages(prev => [...prev, { preview: base64, base64 }]);
    } catch (error) {
      alert('Gagal memproses gambar');
    }
    setIsCompressing(false);
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!note.trim()) {
      alert('Mohon isi keterangan penyelesaian');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        note: note.trim(),
        images: images.map(img => img.base64)
      });
      onClose();
    } catch (error) {
      alert('Gagal menyimpan: ' + error.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900">Selesaikan Laporan</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Report Info */}
        <div className="bg-slate-50 p-3 rounded-xl mb-4">
          <p className="text-xs text-slate-500">Laporan dari: <span className="font-bold text-slate-700">{report.userName}</span></p>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{report.description}</p>
        </div>
        
        {/* Resolution Note */}
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Keterangan Penyelesaian *</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Contoh: Telah diperbaiki oleh teknisi pada tanggal..."
            className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-emerald-500 h-24 resize-none outline-none"
          />
        </div>
        
        {/* Image Upload */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Bukti Foto (Opsional)</label>
            {images.length > 0 && (
              <span className="text-xs text-emerald-600 font-bold">{images.length}/{MAX_IMAGES}</span>
            )}
          </div>
          
          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square">
                  <img src={img.preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover rounded-lg border-2 border-emerald-500" />
                  <button 
                    onClick={() => removeImage(idx)} 
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Upload Button */}
          {images.length < MAX_IMAGES && (
            <label className="block cursor-pointer">
              <div className="w-full h-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 hover:bg-gray-100 hover:border-emerald-400 transition-colors">
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-xs text-emerald-600">Memproses...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{images.length === 0 ? 'Upload bukti foto' : 'Tambah foto'}</span>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={isCompressing} />
            </label>
          )}
        </div>
        
        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !note.trim()}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Tandai Selesai
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Confirmation Modal for general actions
const ConfirmationModal = ({ title, message, onConfirm, onClose, isProcessing }) => (
  <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl scale-100 transition-all" onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="font-bold text-xl text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-200"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Lanjutkan'}
        </button>
      </div>
    </div>
  </div>
);

// Delete Modal Component for RW to delete reports with reason
const DeleteModal = ({ report, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const REASONS = [
    'Spam',
    'Konten tidak pantas',
    'Laporan duplikat',
    'Informasi palsu',
    'Lainnya'
  ];

  const handleDelete = async () => {
    const finalReason = reason === 'Lainnya' ? customReason : reason;
    if (!finalReason.trim()) {
      alert('Mohon pilih atau isi alasan penghapusan');
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm(finalReason);
      onClose();
    } catch (error) {
      alert('Gagal menghapus: ' + error.message);
    }
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Hapus Laporan</h3>
            <p className="text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-xl mb-4">
          <p className="text-xs text-gray-500 mb-1">Laporan yang akan dihapus:</p>
          <p className="font-bold text-gray-800">{report.category}</p>
          <p className="text-sm text-gray-600 truncate">{report.description}</p>
          <p className="text-xs text-gray-400 mt-1">Oleh: {report.userName}</p>
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Alasan Penghapusan *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  reason === r 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          
          {reason === 'Lainnya' && (
            <textarea
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Jelaskan alasan penghapusan..."
              className="w-full p-3 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-red-500 h-20 resize-none outline-none"
            />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || !reason}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Hapus Laporan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Image Modal Component for fullscreen view with navigation for multiple images
const ImageModal = ({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  if (!images || images.length === 0) return null;
  
  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };
  
  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold">
            {currentIndex + 1} / {images.length}
          </div>
        )}
        
        {/* Main Image */}
        <img 
          src={images[currentIndex]} 
          alt={`Lampiran ${currentIndex + 1}`} 
          className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
        
        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-4">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-white scale-110' 
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Component to fetch and display report images from users collection
const ReportImageViewer = ({ reportId, userId, imageCount }) => {
  const [images, setImages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);

  React.useEffect(() => {
    if (!reportId || !userId) {
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        const imageDoc = await getDoc(
          doc(db, 'artifacts', APP_ID, 'users', userId, 'report_images', reportId)
        );
        if (imageDoc.exists()) {
          const data = imageDoc.data();
          // Support both old (single image) and new (multiple images) format
          if (data.images && Array.isArray(data.images)) {
            setImages(data.images);
          } else if (data.imageBase64) {
            setImages([data.imageBase64]);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(true);
      }
      setLoading(false);
    };

    fetchImages();
  }, [reportId, userId]);

  if (loading) {
    return (
      <div className="mt-3">
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl">
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          <span className="text-xs text-slate-400">Memuat...</span>
        </div>
      </div>
    );
  }

  if (error || images.length === 0) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl border border-dashed border-slate-200">
        <span className="text-xs text-slate-400">📷 Gagal load gambar</span>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3">
        {/* Button Lihat Gambar with count */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
        >
          <Eye className="w-4 h-4" />
          Lihat Gambar
          {images.length > 1 && (
            <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[10px]">
              {images.length}
            </span>
          )}
        </button>
      </div>
      
      {/* Modal */}
      {showModal && (
        <ImageModal images={images} onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

const ReportPermitManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState("reports");
  const [statusFilter, setStatusFilter] = useState("active");
  const [data, setData] = useState([]);
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});
  const [resolutionReport, setResolutionReport] = useState(null); // For resolution modal
  const [deleteReport, setDeleteReport] = useState(null); // For delete modal (RW only)
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm, isProcessing }

  // DEFINISI ALUR PERSETUJUAN (Hybrid Approval)
  const APPROVAL_FLOWS = useMemo(() => ({
    // Level 1: RT Saja (Langsung Approved)
    'Izin Tamu': { level: 'RT_ONLY' },
    'Izin Parkir': { level: 'RT_ONLY' },
    
    // Level 2: Bertingkat (RT -> RW -> Approved)
    'Izin Renovasi': { level: 'TIERED' },
    'Izin Acara Besar': { level: 'TIERED' },
    'Izin Acara': { level: 'TIERED' }, 
    
    // Level 3: RW Saja (Fasum)
    'Penggunaan Fasum': { level: 'RW_ONLY' }
  }), []);

  const getFlowType = (type) => {
    // Default fallback ke RT_ONLY jika tipe tidak dikenal
    return APPROVAL_FLOWS[type]?.level || 'RT_ONLY';
  };

  useEffect(() => {
    if (!user) return;
    const colName = activeTab === "reports" ? "reports" : "permits";
    
    // Base Query
    const q = query(
      collection(db, "artifacts", APP_ID, "public", "data", colName),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let fetchedData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // RBAC Filtering High Importance
      // NOTE: RW sees ALL data globally
      // RT sees: (1) Their own RT data + (2) RW_ONLY permits (like Fasum) for visibility
      if (user.role === "RT") {
          const rtCode = user.rtNumber; // e.g. "01"
          fetchedData = fetchedData.filter(item => {
              const unit = (item.userUnit || '').toUpperCase();
              const isOwnRT = unit.includes(`RT${rtCode}`) || 
                     unit.includes(`RT ${rtCode}`) || 
                     unit.includes(`RT.${rtCode}`) ||
                     unit.includes(`RT ${rtCode}`);
              
              // Allow RT to see RW_ONLY permits (like Penggunaan Fasum) - read only
              const flowType = APPROVAL_FLOWS[item.type]?.level || 'RT_ONLY';
              const isRWOnlyPermit = flowType === 'RW_ONLY';
              
              return isOwnRT || isRWOnlyPermit;
          });
      }

      setData(fetchedData);
    });
    
    return () => unsub();
  }, [user, activeTab]);

  // Filter data based on statusFilter
  const filteredData = useMemo(() => {
    let result = [];
    if (statusFilter === "all") result = [...data];
    else if (statusFilter === "active") {
        result = data.filter(
            (item) =>
                item.status === "OPEN" ||
                item.status === "IN_PROGRESS" ||
                item.status === "PENDING" ||
                item.status === "WAITING_RW_APPROVAL" // Include new status
        );
    } else if (statusFilter === "done") {
        result = data.filter(
            (item) =>
                item.status === "DONE" ||
                item.status === "APPROVED" ||
                item.status === "REJECTED"
        );
    }

    return result.sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });
  }, [data, statusFilter]);

  // Separate execution logic
  const executeStatusUpdate = async (id, newStatus, reason = "") => {
    setConfirmAction(prev => ({ ...prev, isProcessing: true }));
    try {
      const colName = activeTab === "reports" ? "reports" : "permits";
      const payload = { status: newStatus };
      if (newStatus === "REJECTED" && reason) payload.rejectReason = reason;

      // Add Approver Info
      if (newStatus === "APPROVED" || newStatus === "WAITING_RW_APPROVAL") {
          const fieldName = user.role === 'RW' ? 'approvedByRW' : 'approvedByRT';
          payload[fieldName] = user.name || user.label;
          payload[`${fieldName}At`] = new Date().toISOString();
      }

      await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", colName, id), payload);
      setConfirmAction(null); // Close modal on success
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui status");
      setConfirmAction(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const updateStatus = (id, newStatus, reason = "") => {
    // Confirmation Titles & Messages
    let title = "Konfirmasi Aksi";
    let message = "Apakah Anda yakin ingin melanjutkan aksi ini?";

    if (newStatus === "WAITING_RW_APPROVAL") {
      title = "Teruskan ke RW?";
      message = "Permohonan akan diteruskan ke RW untuk validasi akhir. Lanjutkan?";
    } else if (newStatus === "APPROVED") {
      title = "Setujui Permohonan?";
      message = "Anda akan menyetujui permohonan ini secara final. Aksi ini tidak dapat dibatalkan.";
    } else if (newStatus === "REJECTED") {
      title = "Tolak Permohonan?";
      message = "Anda akan menolak permohonan ini. Pastikan alasan penolakan sudah sesuai.";
    } else if (newStatus === "IN_PROGRESS") {
      title = "Proses Laporan?";
      message = "Laporan akan ditandai sebagai 'Sedang Diproses'. Warga akan menerima notifikasi.";
    }
    
    setConfirmAction({
      title,
      message,
      onConfirm: () => executeStatusUpdate(id, newStatus, reason),
      isProcessing: false
    });
  };

  // Handle resolution submit (for completing reports with proof)
  const handleResolutionSubmit = async (reportId, resolutionData) => {
    try {
      // Update report status to DONE with resolution info
      await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "reports", reportId), {
        status: "DONE",
        resolutionNote: resolutionData.note,
        hasResolutionImages: resolutionData.images.length > 0,
        resolutionImageCount: resolutionData.images.length,
        resolvedBy: user.name || user.label,
        resolvedByRole: user.role,
        resolvedAt: new Date().toISOString()
      });

      // If there are images, save them to a separate collection
      if (resolutionData.images.length > 0) {
        await setDoc(
          doc(db, "artifacts", APP_ID, "public", "data", "resolution_images", reportId),
          {
            images: resolutionData.images,
            imageCount: resolutionData.images.length,
            createdAt: new Date().toISOString(),
            resolvedBy: user.name || user.label
          }
        );
      }
    } catch (err) {
      console.error(err);
      throw new Error("Gagal menyimpan data penyelesaian");
    }
  };

  // Handle delete report (RW only) without moderation log
  const handleDeleteReport = async (report, reason) => {
    try {
      // 1. Delete report images if exists
      if (report.hasImage) {
        try {
          await deleteDoc(doc(db, "artifacts", APP_ID, "users", report.userId, "report_images", report.id));
        } catch (e) {
          console.log("No images to delete or already deleted");
        }
      }

      // 3. Delete resolution images if exists
      if (report.hasResolutionImages) {
        try {
          await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "resolution_images", report.id));
        } catch (e) {
          console.log("No resolution images to delete");
        }
      }

      // 4. Hard delete the report
      await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "reports", report.id));

    } catch (err) {
      console.error(err);
      throw new Error("Gagal menghapus laporan");
    }
  };

  // Get status counts for badges
  const statusCounts = useMemo(() => ({
      all: data.length,
      active: data.filter(i => ['OPEN', 'IN_PROGRESS', 'PENDING', 'WAITING_RW_APPROVAL'].includes(i.status)).length,
      done: data.filter(i => ['DONE', 'APPROVED', 'REJECTED'].includes(i.status)).length,
  }), [data]);

  // Get status badge styling - now accepts flowType for accurate labeling
  const getStatusBadge = (status, flowType = null) => {
    switch (status) {
      case "OPEN": return { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle, label: "Menunggu" };
      case "PENDING": 
        // For RW_ONLY, show "Menunggu RW" instead of "Menunggu RT"
        if (flowType === 'RW_ONLY') {
          return { bg: "bg-amber-100", text: "text-amber-700", icon: Clock, label: "Menunggu RW" };
        }
        return { bg: "bg-orange-100", text: "text-orange-700", icon: Clock, label: "Menunggu RT" };
      case "WAITING_RW_APPROVAL": return { bg: "bg-purple-100", text: "text-purple-700", icon: Clock, label: "Validasi RW" };
      case "IN_PROGRESS": return { bg: "bg-yellow-100", text: "text-yellow-700", icon: Clock, label: "Diproses" };
      case "DONE": return { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Selesai" };
      case "APPROVED": return { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle, label: "Disetujui" };
      case "REJECTED": return { bg: "bg-slate-100", text: "text-slate-600", icon: AlertCircle, label: "Ditolak" };
      default: return { bg: "bg-gray-100", text: "text-gray-700", icon: AlertCircle, label: status };
    }
  };

  const getReportIconStyle = (category = "") => {
    const key = category.toLowerCase();
    if (key.includes("keamanan")) return "bg-red-100 text-red-600";
    if (key.includes("kebersihan")) return "bg-green-100 text-green-600";
    if (key.includes("infrastruktur")) return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-600";
  };

  const formatDate = (date) => {
    if (!date) return "-";
    let d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Pusat Layanan Warga</h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab("reports")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "reports" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}>Keluhan / Laporan</button>
          <button onClick={() => setActiveTab("permits")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "permits" ? "bg-white shadow text-emerald-700" : "text-slate-500"}`}>Surat & Izin</button>
        </div>
      </div>



      {/* Status Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Status</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'done'].map(filter => (
             <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  statusFilter === filter
                    ? (filter === 'active' ? "bg-orange-500 text-white shadow-lg" : filter === 'done' ? "bg-green-500 text-white shadow-lg" : "bg-slate-800 text-white shadow-lg")
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter === 'all' && 'Semua'}
                {filter === 'active' && 'Aktif'}
                {filter === 'done' && 'Selesai'}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusFilter === filter ? "bg-white/20" : "bg-slate-200"}`}>
                  {statusCounts[filter]}
                </span>
              </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
            <p className="text-slate-400 italic">Tidak ada data.</p>
          </div>
        ) : (
          filteredData.map((item) => {
            const flowType = getFlowType(item.type);
            const statusBadge = getStatusBadge(item.status, flowType);
            const StatusIcon = statusBadge.icon;

            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
                {/* Icon */}
                <div className={`p-3 rounded-full ${activeTab === "reports" ? getReportIconStyle(item.category) : `${statusBadge.bg} ${statusBadge.text}`}`}>
                  {activeTab === "reports" ? <AlertTriangle className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge.bg} ${statusBadge.text} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                    {/* Flow Type Badge - Only for Permits */}
                    {activeTab === "permits" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        flowType === 'RT_ONLY' ? 'bg-cyan-100 text-cyan-700' :
                        flowType === 'TIERED' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {flowType === 'RT_ONLY' && '🏠 RT Only'}
                        {flowType === 'TIERED' && '📋 RT → RW'}
                        {flowType === 'RW_ONLY' && '🏛️ RW Only'}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                  </div>
                  <h3 className="font-bold text-slate-800">{activeTab === "reports" ? item.category : item.type}</h3>
                  <p className="text-sm text-slate-600">
                    {item.description?.split(/(?<=\.\s)|(?<=\.$)/).map((segment, i) => {
                      const colonIndex = segment.indexOf(':');
                      if (colonIndex > 0 && colonIndex < 20) {
                        const label = segment.substring(0, colonIndex);
                        const rest = segment.substring(colonIndex);
                        return <span key={i}><strong className="font-semibold text-slate-700">{label}</strong>{rest}</span>;
                      }
                      return <span key={i}>{segment}</span>;
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 font-mono">
                      <span>👤 {item.userName}</span>
                      <span>🏠 {item.userUnit}</span>
                  </div>
                  {/* Image Preview - Only for Reports with hasImage flag */}
                  {activeTab === "reports" && item.hasImage && (
                    <ReportImageViewer reportId={item.id} userId={item.userId} />
                  )}
                  {(item.approvedByRT || item.approvedByRW) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.approvedByRT && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                          ✓ RT: {item.approvedByRT}
                        </span>
                      )}
                      {item.approvedByRW && (
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">
                          ✓ RW: {item.approvedByRW}
                        </span>
                      )}
                    </div>
                  )}
                  {item.status === 'REJECTED' && <p className="text-xs text-red-500 mt-1">⚠️ Alasan: {item.rejectReason}</p>}
                </div>

                {/* ACTION BUTTONS (The Core Logic) */}
                <div className="flex gap-2">
                  {/* === REPORTS LOGIC (Simpler) === */}
                  {activeTab === "reports" && (
                     <>
                        {/* RT ONLY: Process and Finish */}
                        {/* RT ONLY: Process and Finish */}
                        {user.role === "RT" && item.status === "OPEN" && (
                            <button 
                              onClick={() => updateStatus(item.id, "IN_PROGRESS")} 
                              className="group flex items-center gap-2 px-4 py-2 bg-white border border-yellow-300 text-yellow-700 rounded-xl text-xs font-bold hover:bg-yellow-50 hover:border-yellow-400 hover:shadow-md transition-all"
                            >
                              <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                              Proses Laporan
                            </button>
                        )}
                        {user.role === "RT" && item.status === "IN_PROGRESS" && (
                            <button 
                              onClick={() => setResolutionReport(item)} 
                              className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-xs font-bold hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Selesaikan Laporan
                            </button>
                        )}
                        {/* Delete Button - RW Only */}
                        {user.role === "RW" && (
                            <button 
                              onClick={() => setDeleteReport(item)} 
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Hapus
                            </button>
                        )}
                     </>
                  )}

                  {/* === PERMITS LOGIC (Hybrid Approval) === */}
                  {activeTab === "permits" && (
                    <>
                        {/* 1. APPROVE/REJECT BUTTONS */}
                        {(() => {
                            // CASE A: RT Only Logic
                            if (flowType === 'RT_ONLY') {
                                if (user.role === 'RT' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Setujui</button>
                                        </>
                                    );
                                }
                            }

                            // CASE B: Tiered Logic (RT -> RW)
                            if (flowType === 'TIERED') {
                                // RT Step
                                if (user.role === 'RT' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'WAITING_RW_APPROVAL')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Validasi & Teruskan ke RW</button>
                                        </>
                                    );
                                }
                                // RW Step
                                if (user.role === 'RW' && item.status === 'WAITING_RW_APPROVAL') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">Setujui Final</button>
                                        </>
                                    );
                                }
                            }

                            // CASE C: RW Only Logic
                            if (flowType === 'RW_ONLY') {
                                if (user.role === 'RW' && item.status === 'PENDING') {
                                    return (
                                        <>
                                            <button onClick={() => setShowRejectInput({[item.id]: true})} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Tolak</button>
                                            <button onClick={() => updateStatus(item.id, 'APPROVED')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Setujui</button>
                                        </>
                                    );
                                }
                            }
                            
                            // READ ONLY STATES INFORMATION
                            // RT melihat TIERED yang masih PENDING (RT bisa approve ini, jadi tidak perlu pesan)
                            // RW melihat TIERED yang PENDING - tunggu RT dulu
                            if (item.status === 'PENDING' && user.role === 'RW' && flowType === 'TIERED') {
                                return <span className="text-xs text-slate-400 italic">Menunggu Validasi RT setempat...</span>;
                            }
                            // RT melihat RW_ONLY - hanya bisa lihat, tidak ada aksi
                            if (item.status === 'PENDING' && user.role === 'RT' && flowType === 'RW_ONLY') {
                                return <span className="text-xs text-amber-600 italic">🏛️ Kewenangan RW</span>;
                            }
                            // RT melihat TIERED yang sudah di-approve RT (lagi menunggu RW)
                            if (item.status === 'WAITING_RW_APPROVAL' && user.role === 'RT') {
                                return <span className="text-xs text-purple-600 italic">⏳ Menunggu Validasi RW</span>;
                            }
                            if (['APPROVED', 'DONE'].includes(item.status)) return <span className="text-xs text-green-600 font-bold">Disetujui</span>;
                            if (item.status === 'REJECTED') return <span className="text-xs text-red-500 font-bold">Ditolak</span>;

                            return null;
                        })()}

                        {/* REJECT INPUT POPUP */}
                        {showRejectInput[item.id] && (
                            <div className="absolute right-0 mt-8 mr-4 bg-white p-3 rounded-xl shadow-xl border border-red-100 z-10 w-64">
                                <p className="text-xs font-bold text-slate-700 mb-2">Alasan Penolakan:</p>
                                <textarea 
                                    value={rejectReason[item.id] || ''} 
                                    onChange={e => setRejectReason({...rejectReason, [item.id]: e.target.value})}
                                    className="w-full text-xs p-2 border rounded-lg mb-2"
                                    rows="2"
                                ></textarea>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setShowRejectInput({...showRejectInput, [item.id]: false})} className="text-xs text-slate-500">Batal</button>
                                    <button 
                                        onClick={() => {
                                            updateStatus(item.id, 'REJECTED', rejectReason[item.id]); 
                                            setShowRejectInput({...showRejectInput, [item.id]: false});
                                        }} 
                                        className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg"
                                    >
                                        Konfirmasi
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Resolution Modal */}
      {resolutionReport && (
        <ResolutionModal
          report={resolutionReport}
          user={user}
          onClose={() => setResolutionReport(null)}
          onSubmit={(resolutionData) => handleResolutionSubmit(resolutionReport.id, resolutionData)}
        />
      )}

      {/* Delete Modal (RW Only) */}
      {deleteReport && (
        <DeleteModal
          report={deleteReport}
          onClose={() => setDeleteReport(null)}
          onConfirm={(reason) => handleDeleteReport(deleteReport, reason)}
        />
      )}

      {/* General Confirmation Modal */}
      {confirmAction && (
        <ConfirmationModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
          isProcessing={confirmAction.isProcessing}
        />
      )}
    </div>
  );
};

export default ReportPermitManager;

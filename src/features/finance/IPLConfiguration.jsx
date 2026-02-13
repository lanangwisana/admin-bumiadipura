import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, APP_ID } from "../../config";
import { Edit2, Save, X, Settings, CheckCircle, XCircle } from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";

const defaultConfig = {
  rwFee: 65000,
  rtFees: {},
  appFee: 1000,
};

const IPLConfiguration = ({ user }) => {
  const perms = usePermissions(user);
  const [config, setConfig] = useState(defaultConfig);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(defaultConfig);
  const [saving, setSaving] = useState(false);
  const rtList = ["01", "02", "03", "04", "05", "06", "07", "08"];
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  const configRef = doc(
    db,
    "artifacts",
    APP_ID,
    "public",
    "data",
    "ipl_config",
    "current",
  );

  useEffect(() => {
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setConfig(data);

        setForm({
          ...defaultConfig,
          ...data,
          rtFees: data.rtFees || {},
        });
      } else {
        setConfig(defaultConfig);
        setForm(defaultConfig);
      }
    });

    return () => unsub();
  }, []);

  // Save Config + History
  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = perms.isRT
        ? {
            rtFees: {
              ...config.rtFees,
              [perms.rtNumber]: Number(form.rtFees[perms.rtNumber]) || 0,
            },
            updatedAt: serverTimestamp(),
          }
        : {
            rwFee: Number(form.rwFee) || 0,
            appFee: Number(form.appFee) || 0,
            rtFees: Object.fromEntries(
              Object.entries(form.rtFees || {}).map(([rt, fee]) => [
                rt,
                Number(fee) || 0,
              ]),
            ),
            updatedAt: serverTimestamp(),
          };

      // overwrite current
      await setDoc(configRef, payload, { merge: true });

      setEditMode(false);
      showFeedback({
        type: "success",
        title: "Berhasil!",
        message: "Konfigurasi IPL berhasil diperbarui.",
      });
    } catch (err) {
      console.error(err);
      showFeedback({
        type: "error",
        title: "Gagal menyimpan",
        message: "Terjadi kesalahan saat menyimpan konfigurasi.",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateRTFee = (rt, value) => {
    setForm((prev) => ({
      ...prev,
      rtFees: {
        ...prev.rtFees,
        [rt]: value,
      },
    }));
  };

  const role = perms?.role;
  const isRW = role === "RW";
  const isRT = role === "RT";
  const canEdit = perms.isRW || perms.isRT;
  const canEditRWOnly = perms.isRW;
  const visibleRTs = perms.isRW
    ? rtList
    : rtList.filter((rt) => rt === perms.rtNumber);

  const formatRupiah = (value) => {
    if (!value && value !== 0) return "Rp 0";

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const showFeedback = ({
    type = "success",
    title,
    message,
    duration = 2500,
  }) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setFeedbackModal({
        isOpen: false,
        type: "success",
        title: "",
        message: "",
      });
    }, duration);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* CARD */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            <Settings className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xl font-bold text-slate-800">
              Konfigurasi IPL Aktif
            </h3>
          </div>

          {canEdit && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* RW FEE */}
          <div>
            <label className="text-xs font-bold text-slate-500">Iuran RW</label>

            <input
              type="text"
              inputMode="numeric"
              disabled={!editMode || !isRW}
              value={editMode ? (form.rwFee ?? "") : formatRupiah(form.rwFee)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  rwFee: Number(e.target.value),
                }))
              }
              className={`w-full mt-1 p-2 border rounded ${
                editMode && !isRW
                  ? "bg-slate-100 border-slate-200 cursor-not-allowed"
                  : ""
              }`}
            />

            {editMode && !isRW && (
              <p className="text-[11px] text-slate-400 mt-1">
                Hanya RW yang dapat mengedit biaya ini
              </p>
            )}
          </div>

          {/* APP FEE */}
          <div>
            <label className="text-xs font-bold text-slate-500">
              Biaya Aplikasi
            </label>

            <input
              type="text"
              inputMode="numeric"
              disabled={!editMode || !isRW}
              value={editMode ? (form.appFee ?? "") : formatRupiah(form.appFee)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  appFee: Number(e.target.value),
                }))
              }
              className={`w-full mt-1 p-2 border rounded ${
                editMode && !isRW
                  ? "bg-slate-100 border-slate-200 cursor-not-allowed"
                  : ""
              }`}
            />

            {editMode && !isRW && (
              <p className="text-[11px] text-slate-400 mt-1">
                Hanya RW yang dapat mengedit biaya ini
              </p>
            )}
          </div>
        </div>

        {/* RT FEES */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-slate-500">Iuran RT</label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleRTs.map((rt) => {
              const rawFee = form.rtFees?.[rt];
              const isDisabled =
                !editMode || !perms.isRT || perms.rtNumber !== rt;

              return (
                <div key={rt}>
                  <div className="flex gap-2 min-w-0">
                    <input
                      disabled
                      value={`RT ${rt}`}
                      className="w-20 p-2 border rounded bg-slate-100"
                    />

                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={isDisabled}
                      value={
                        editMode ? (rawFee ?? "") : formatRupiah(rawFee || 0)
                      }
                      onChange={(e) => updateRTFee(rt, Number(e.target.value))}
                      className={`flex-1 p-2 border rounded transition
              ${
                isDisabled
                  ? "bg-slate-100 border-slate-200 cursor-not-allowed"
                  : ""
              }
            `}
                    />
                  </div>

                  {/* helper text */}
                  {editMode && isDisabled && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hanya RT terkait yang dapat mengedit biaya ini
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* IPL TABLE */}
        {!editMode && (
          <div className="mt-8">
            <h4 className="text-xs font-bold text-slate-500 mb-3">
              Tabel IPL per RT
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4">RT</th>
                    <th className="p-4">Iuran RT</th>
                    <th className="p-4">Iuran RW</th>
                    <th className="p-4 whitespace-nowrap">Biaya App</th>
                    <th className="p-4 whitespace-nowrap">Total Tagihan</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRTs.map((rt) => {
                    const rwFee = Number(config.rwFee) || 0;
                    const appFee = Number(config.appFee) || 0;
                    const rtFee = Number(config.rtFees?.[rt]) || 0;

                    const total = rwFee + rtFee + appFee;

                    return (
                      <tr
                        key={rt}
                        className="border-b hover:bg-slate-50 transition"
                      >
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
                            RT {rt}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {formatRupiah(rtFee)}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {formatRupiah(rwFee)}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {formatRupiah(appFee)}
                        </td>

                        <td className="p-4 font-bold text-emerald-600 whitespace-nowrap">
                          {formatRupiah(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTION */}
        {editMode && (isRW || perms.isRT) && (
          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Simpan
            </button>

            <button
              onClick={() => {
                setEditMode(false);
                setForm(config);
              }}
              className="flex items-center gap-2 border px-6 py-2 rounded-xl font-bold text-slate-600"
            >
              <X className="w-4 h-4" />
              Batal
            </button>
          </div>
        )}
      </div>
      
      {/* FEEDBACK MODAL */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                feedbackModal.type === "success"
                  ? "bg-emerald-100"
                  : "bg-red-100"
              }`}
            >
              {feedbackModal.type === "success" ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>

            <h3 className="font-bold text-xl text-slate-800 mb-2">
              {feedbackModal.title}
            </h3>
            <p className="text-sm text-slate-500">{feedbackModal.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPLConfiguration;

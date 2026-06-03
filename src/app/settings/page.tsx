'use client';

import { useEffect, useState } from 'react';
import { AppSettings, getSettings, saveSettings, clearAllData, getCubes, getSampleCubes, addCube, saveCubes, saveLogs } from '@/lib/storage';
import { Bell, CalendarClock, Package, RotateCcw, Trash2, ChevronRight, Check } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

type ConfirmType = 'reset' | 'clearAll' | null;

type DraftKey = 'expiryWarningDays' | 'defaultWarningThreshold' | 'defaultDangerThreshold' | 'defaultGramsPerCube';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<DraftKey, string>>(() => {
    const s = getSettings();
    return {
      expiryWarningDays: String(s.expiryWarningDays),
      defaultWarningThreshold: String(s.defaultWarningThreshold),
      defaultDangerThreshold: String(s.defaultDangerThreshold),
      defaultGramsPerCube: String(s.defaultGramsPerCube),
    };
  });

  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    setDraft({
      expiryWarningDays: String(s.expiryWarningDays),
      defaultWarningThreshold: String(s.defaultWarningThreshold),
      defaultDangerThreshold: String(s.defaultDangerThreshold),
      defaultGramsPerCube: String(s.defaultGramsPerCube),
    });
    if ('Notification' in window) {
      setPushStatus(Notification.permission as typeof pushStatus);
    }
  }, []);

  function handleNumberChange(key: DraftKey, raw: string) {
    const cleaned = raw.replace(/^0+(\d)/, '$1');
    setDraft((d) => ({ ...d, [key]: cleaned }));
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 1) {
      updateSetting(key, num);
    }
  }

  function handleNumberBlur(key: DraftKey) {
    const num = parseInt(draft[key], 10);
    if (isNaN(num) || num < 1) {
      // 빈값이거나 유효하지 않으면 저장된 원래 값으로 복원
      setDraft((d) => ({ ...d, [key]: String(settings[key]) }));
    }
  }

  function handleNumberKeyDown(key: DraftKey, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setDraft((d) => ({ ...d, [key]: String(settings[key]) }));
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }

  async function handlePushToggle() {
    if (!('Notification' in window)) {
      setPushError('이 브라우저는 푸시 알림을 지원하지 않아요.');
      return;
    }
    if (pushStatus === 'denied') {
      setPushError('브라우저 설정에서 알림 권한을 직접 허용해 주세요. (주소창 자물쇠 아이콘 → 알림 → 허용)');
      return;
    }
    setPushError(null);
    if (pushStatus === 'granted') {
      updateSetting('pushNotification', false);
      return;
    }
    const result = await Notification.requestPermission();
    setPushStatus(result as typeof pushStatus);
    if (result === 'granted') {
      updateSetting('pushNotification', true);
      new Notification('Cubridge 알림 활성화 🍼', { body: '재고 부족 시 알림을 받을 수 있어요!' });
    }
  }

  function handleResetSample() {
    saveCubes([]);
    getSampleCubes().forEach((s) => addCube(s));
    setConfirmType(null);
  }

  function handleClearAll() {
    clearAllData();
    setConfirmType(null);
  }

  function handleExport() {
    const data = {
      cubes: getCubes(),
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubridge_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">설정</h1>
        {saved && (
          <span className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <Check size={14} /> 저장됨
          </span>
        )}
      </div>

      {/* 유통기한 설정 */}
      <Section icon={<CalendarClock size={18} />} title="유통기한">
        <SettingRow
          label="임박 알림 기준"
          description="이 기간 안에 만료되면 카드에 경고 표시"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={draft.expiryWarningDays}
              onChange={(e) => handleNumberChange('expiryWarningDays', e.target.value)}
              onBlur={() => handleNumberBlur('expiryWarningDays')}
              onKeyDown={(e) => handleNumberKeyDown('expiryWarningDays', e)}
              className="w-16 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <span className="text-sm text-gray-500">일 전</span>
          </div>
        </SettingRow>
      </Section>

      {/* 새 큐브 기본값 */}
      <Section icon={<Package size={18} />} title="새 큐브 기본값">
        <SettingRow label="주의 기준" description="새 큐브 추가 시 기본 주의 수량">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={draft.defaultWarningThreshold}
              onChange={(e) => handleNumberChange('defaultWarningThreshold', e.target.value)}
              onBlur={() => handleNumberBlur('defaultWarningThreshold')}
              onKeyDown={(e) => handleNumberKeyDown('defaultWarningThreshold', e)}
              className="w-16 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <span className="text-sm text-gray-500">개 이하</span>
          </div>
        </SettingRow>
        <SettingRow label="부족 기준" description="새 큐브 추가 시 기본 부족 수량">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={draft.defaultDangerThreshold}
              onChange={(e) => handleNumberChange('defaultDangerThreshold', e.target.value)}
              onBlur={() => handleNumberBlur('defaultDangerThreshold')}
              onKeyDown={(e) => handleNumberKeyDown('defaultDangerThreshold', e)}
              className="w-16 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <span className="text-sm text-gray-500">개 이하</span>
          </div>
        </SettingRow>
        <SettingRow label="기본 용량" description="새 큐브 추가 시 기본 1큐브 용량">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={draft.defaultGramsPerCube}
              onChange={(e) => handleNumberChange('defaultGramsPerCube', e.target.value)}
              onBlur={() => handleNumberBlur('defaultGramsPerCube')}
              onKeyDown={(e) => handleNumberKeyDown('defaultGramsPerCube', e)}
              className="w-16 text-center border border-[var(--border)] rounded-lg py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <span className="text-sm text-gray-500">g</span>
          </div>
        </SettingRow>
      </Section>

      {/* 알림 */}
      <Section icon={<Bell size={18} />} title="알림">
        <SettingRow
          label="브라우저 푸시 알림"
          description={
            pushStatus === 'denied'
              ? '브라우저에서 알림 권한이 차단됐어요'
              : '재고 부족 시 브라우저 알림 받기'
          }
        >
          <button
            onClick={handlePushToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.pushNotification && pushStatus === 'granted'
                ? 'bg-[var(--primary)]'
                : 'bg-gray-200'
            } ${pushStatus === 'denied' ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.pushNotification && pushStatus === 'granted' ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </SettingRow>
        {pushError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mx-1">{pushError}</p>
        )}
      </Section>

      {/* 데이터 관리 */}
      <Section icon={<RotateCcw size={18} />} title="데이터 관리">
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition text-left"
        >
          <div>
            <div className="text-sm font-medium text-gray-700">데이터 백업 (JSON)</div>
            <div className="text-xs text-gray-400 mt-0.5">큐브 목록을 파일로 내보내기</div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <button
          onClick={() => setConfirmType('reset')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-orange-50 transition text-left"
        >
          <div>
            <div className="text-sm font-medium text-gray-700">샘플 데이터로 초기화</div>
            <div className="text-xs text-gray-400 mt-0.5">기존 큐브 데이터를 지우고 예시 데이터 복원</div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>

        <button
          onClick={() => setConfirmType('clearAll')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-red-50 transition text-left"
        >
          <div>
            <div className="text-sm font-medium text-red-500 flex items-center gap-1.5">
              <Trash2 size={14} /> 모든 데이터 삭제
            </div>
            <div className="text-xs text-gray-400 mt-0.5">큐브, 소비 기록 전부 삭제 (되돌릴 수 없음)</div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </Section>

      {/* 앱 정보 */}
      <div className="mt-6 text-center text-xs text-gray-300">
        Cubridge v1.0 · 로컬 저장 모드
      </div>

      {confirmType === 'reset' && (
        <ConfirmModal
          title="샘플 데이터로 초기화"
          message="기존 큐브 데이터를 모두 지우고 샘플 데이터로 복원할까요? 소비 기록은 유지됩니다."
          confirmLabel="초기화"
          onConfirm={handleResetSample}
          onCancel={() => setConfirmType(null)}
        />
      )}

      {confirmType === 'clearAll' && (
        <ConfirmModal
          title="모든 데이터 삭제"
          message="큐브와 소비 기록을 모두 삭제할까요? 이 작업은 되돌릴 수 없어요."
          confirmLabel="전체 삭제"
          danger
          onConfirm={handleClearAll}
          onCancel={() => setConfirmType(null)}
        />
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
        <span className="text-[var(--primary)]">{icon}</span>
        <span className="text-sm font-semibold text-gray-600">{title}</span>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

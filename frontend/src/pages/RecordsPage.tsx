import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi, equipmentApi } from '../lib/api';
import type { MaintenanceRecord, Equipment, RecordFilter } from 'shared';
import styles from './RecordsPage.module.css';

function RecordsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RecordFilter>({});
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    symptom: '',
    cause: '',
    solution: '',
  });

  // Fetch equipment for filter dropdown
  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: equipmentApi.list,
  });

  // Fetch records
  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ['records', filter],
    queryFn: () => recordsApi.list(filter),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { symptom?: string; cause?: string; solution?: string } }) =>
      recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      setEditingRecord(null);
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setEditForm({
      symptom: record.symptom,
      cause: record.cause,
      solution: record.solution,
    });
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateMutation.mutate({
      id: editingRecord.id,
      data: editForm,
    });
  };

  const handleExport = async () => {
    try {
      const blob = await recordsApi.export(filter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `records_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const equipmentMap = useMemo(() => {
    return equipment.reduce<Record<string, string>>((acc, eq) => {
      acc[eq.id] = eq.equipmentName;
      return acc;
    }, {});
  }, [equipment]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>メンテナンス記録一覧</h1>
        <button onClick={handleExport} className={styles.exportButton}>
          CSVエクスポート
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          value={filter.equipmentId || ''}
          onChange={(e) => setFilter({ ...filter, equipmentId: e.target.value || undefined })}
          className={styles.filterSelect}
        >
          <option value="">全ての設備</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.equipmentId} - {eq.equipmentName}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filter.startDate || ''}
          onChange={(e) => setFilter({ ...filter, startDate: e.target.value || undefined })}
          className={styles.filterInput}
          placeholder="開始日"
        />
        <input
          type="date"
          value={filter.endDate || ''}
          onChange={(e) => setFilter({ ...filter, endDate: e.target.value || undefined })}
          className={styles.filterInput}
          placeholder="終了日"
        />
        <input
          type="text"
          value={filter.keyword || ''}
          onChange={(e) => setFilter({ ...filter, keyword: e.target.value || undefined })}
          className={styles.filterInput}
          placeholder="キーワード検索"
        />
      </div>

      {/* Records table */}
      {isLoading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : records.length === 0 ? (
        <div className={styles.noData}>記録がありません</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>設備</th>
                <th>症状</th>
                <th>原因</th>
                <th>対策</th>
                <th>作成日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{equipmentMap[record.equipmentId] || record.equipmentId}</td>
                  <td className={styles.textCell}>{record.symptom}</td>
                  <td className={styles.textCell}>{record.cause}</td>
                  <td className={styles.textCell}>{record.solution}</td>
                  <td>{new Date(record.createdAt).toLocaleString('ja-JP')}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(record)}
                        className={styles.editButton}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className={styles.deleteButton}
                        disabled={deleteMutation.isPending}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit dialog */}
      {editingRecord && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h2>記録を編集</h2>
            <div className={styles.field}>
              <label>症状</label>
              <textarea
                value={editForm.symptom}
                onChange={(e) => setEditForm({ ...editForm, symptom: e.target.value })}
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label>原因</label>
              <textarea
                value={editForm.cause}
                onChange={(e) => setEditForm({ ...editForm, cause: e.target.value })}
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label>対策</label>
              <textarea
                value={editForm.solution}
                onChange={(e) => setEditForm({ ...editForm, solution: e.target.value })}
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.dialogActions}>
              <button
                onClick={() => setEditingRecord(null)}
                className={styles.cancelButton}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                className={styles.saveButton}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordsPage;

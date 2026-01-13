import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '../lib/api';
import type { Equipment, CreateEquipmentRequest } from 'shared';
import styles from './EquipmentPage.module.css';

function EquipmentPage() {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [form, setForm] = useState<CreateEquipmentRequest>({
    equipmentId: '',
    equipmentName: '',
  });

  // Fetch equipment
  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: equipmentApi.list,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: equipmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateEquipmentRequest }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEditingEquipment(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  const resetForm = () => {
    setForm({ equipmentId: '', equipmentName: '' });
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!form.equipmentId || !form.equipmentName) return;
    createMutation.mutate(form);
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setForm({
      equipmentId: eq.equipmentId,
      equipmentName: eq.equipmentName,
    });
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingEquipment || !form.equipmentId || !form.equipmentName) return;
    updateMutation.mutate({
      id: editingEquipment.id,
      data: form,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この設備を削除しますか？関連するメンテナンス記録が存在する場合は削除できません。')) {
      return;
    }
    deleteMutation.mutate(id);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>設備マスタ</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className={styles.addButton}
        >
          + 設備を追加
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>読み込み中...</div>
      ) : equipment.length === 0 ? (
        <div className={styles.noData}>設備が登録されていません</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>設備ID</th>
                <th>設備名</th>
                <th>作成日時</th>
                <th>更新日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((eq) => (
                <tr key={eq.id}>
                  <td>{eq.equipmentId}</td>
                  <td>{eq.equipmentName}</td>
                  <td>{new Date(eq.createdAt).toLocaleString('ja-JP')}</td>
                  <td>{new Date(eq.updatedAt).toLocaleString('ja-JP')}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(eq)}
                        className={styles.editButton}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(eq.id)}
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

      {/* Add dialog */}
      {showAddDialog && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h2>設備を追加</h2>
            <form onSubmit={handleAdd}>
              <div className={styles.field}>
                <label htmlFor="equipmentId">設備ID</label>
                <input
                  id="equipmentId"
                  type="text"
                  value={form.equipmentId}
                  onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="equipmentName">設備名</label>
                <input
                  id="equipmentName"
                  type="text"
                  value={form.equipmentName}
                  onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    resetForm();
                  }}
                  className={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      {editingEquipment && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h2>設備を編集</h2>
            <form onSubmit={handleSaveEdit}>
              <div className={styles.field}>
                <label htmlFor="editEquipmentId">設備ID</label>
                <input
                  id="editEquipmentId"
                  type="text"
                  value={form.equipmentId}
                  onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="editEquipmentName">設備名</label>
                <input
                  id="editEquipmentName"
                  type="text"
                  value={form.equipmentName}
                  onChange={(e) => setForm({ ...form, equipmentName: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingEquipment(null);
                    resetForm();
                  }}
                  className={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentPage;

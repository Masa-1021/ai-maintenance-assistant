import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, equipmentApi, recordsApi, fileApi } from '../lib/api';
import { useChatStore } from '../stores/chatStore';
import type { Equipment } from 'shared';
import styles from './ChatPage.module.css';

function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const {
    sessions,
    currentSession,
    messages,
    extractedInfo,
    isSending,
    setSessions,
    setCurrentSession,
    setMessages,
    addMessage,
    setExtractedInfo,
    setIsSending,
    reset,
  } = useChatStore();

  // Fetch equipment list
  const { data: equipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment'],
    queryFn: equipmentApi.list,
  });

  // Fetch sessions
  const { data: sessionsData = [] } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: chatApi.listSessions,
  });

  useEffect(() => {
    if (sessionsData.length > 0 || sessions.length > 0) {
      setSessions(sessionsData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsData]);

  // Fetch messages when session changes
  useEffect(() => {
    if (sessionId) {
      const fetchSessionData = async () => {
        try {
          const [session, messagesData] = await Promise.all([
            chatApi.getSession(sessionId),
            chatApi.getMessages(sessionId),
          ]);
          setCurrentSession(session);
          setMessages(messagesData);
        } catch (error) {
          console.error('Failed to fetch session data:', error);
          navigate('/chat');
        }
      };
      fetchSessionData();
    } else {
      reset();
    }
  }, [sessionId, setCurrentSession, setMessages, reset, navigate]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setShowNewSessionDialog(false);
      setSelectedEquipment('');
      setPdfFile(null);
      navigate(`/chat/${newSession.id}`);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, pdfKey }: { content: string; pdfKey?: string }) => {
      if (!sessionId) throw new Error('No session');
      return chatApi.sendMessage(sessionId, { content, pdfKey });
    },
    onSuccess: (response) => {
      addMessage(response.userMessage);
      addMessage(response.assistantMessage);
      setExtractedInfo(response.extractedInfo);
      setIsSending(false);
    },
    onError: () => {
      setIsSending(false);
    },
  });

  // Create record mutation
  const createRecordMutation = useMutation({
    mutationFn: recordsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      alert('記録を保存しました');
    },
  });

  const handleCreateSession = async () => {
    if (!selectedEquipment) return;

    let pdfKey: string | undefined;
    if (pdfFile) {
      setUploadingPdf(true);
      try {
        pdfKey = await fileApi.uploadFile(pdfFile);
      } catch (error) {
        console.error('Failed to upload PDF:', error);
        alert('PDFのアップロードに失敗しました');
        setUploadingPdf(false);
        return;
      }
      setUploadingPdf(false);
    }

    const selectedEquipmentData = equipment.find((e) => e.id === selectedEquipment);
    createSessionMutation.mutate({
      equipmentId: selectedEquipment,
      title: `${selectedEquipmentData?.equipmentName || ''} - ${new Date().toLocaleDateString('ja-JP')}`,
    });

    // If PDF was uploaded, send initial message with PDF
    if (pdfKey && sessionId) {
      sendMessageMutation.mutate({
        content: 'PDFを添付しました。内容を確認してください。',
        pdfKey,
      });
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || !sessionId) return;

    setIsSending(true);
    setMessage('');
    sendMessageMutation.mutate({ content: message });
  };

  const handleSaveRecord = () => {
    if (!currentSession || !extractedInfo) return;

    createRecordMutation.mutate({
      equipmentId: currentSession.equipmentId,
      symptom: extractedInfo.symptom || '',
      cause: extractedInfo.cause || '',
      solution: extractedInfo.solution || '',
      chatSessionId: currentSession.id,
    });
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('このセッションを削除しますか？')) return;
    await chatApi.deleteSession(id);
    queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    if (sessionId === id) {
      navigate('/chat');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB以下にしてください');
        return;
      }
      setPdfFile(file);
    } else {
      alert('PDFファイルを選択してください');
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <button
          className={styles.newChatButton}
          onClick={() => setShowNewSessionDialog(true)}
        >
          + 新規チャット
        </button>
        <div className={styles.sessionList}>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`${styles.sessionItem} ${
                sessionId === session.id ? styles.active : ''
              }`}
              onClick={() => navigate(`/chat/${session.id}`)}
            >
              <div className={styles.sessionTitle}>{session.title}</div>
              <div className={styles.sessionMeta}>
                <span
                  className={`${styles.status} ${
                    session.status === 'completed' ? styles.completed : ''
                  }`}
                >
                  {session.status === 'completed' ? '完了' : '進行中'}
                </span>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className={styles.main}>
        {sessionId ? (
          <>
            <div className={styles.chatHeader}>
              <h2>{currentSession?.title}</h2>
            </div>
            <div className={styles.messages}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.role === 'user' ? styles.user : styles.assistant
                  }`}
                >
                  <div className={styles.messageContent}>{msg.content}</div>
                  {msg.pdfKey && (
                    <div className={styles.attachment}>📎 PDF添付</div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={styles.typing}>入力中...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Extracted info panel */}
            {extractedInfo && (
              <div className={styles.extractedInfo}>
                <h3>抽出情報</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>症状</label>
                    <p>{extractedInfo.symptom || '未入力'}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>原因</label>
                    <p>{extractedInfo.cause || '未入力'}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>対策</label>
                    <p>{extractedInfo.solution || '未入力'}</p>
                  </div>
                </div>
                {extractedInfo.isComplete && (
                  <button
                    className={styles.saveButton}
                    onClick={handleSaveRecord}
                    disabled={createRecordMutation.isPending}
                  >
                    {createRecordMutation.isPending ? '保存中...' : '記録を保存'}
                  </button>
                )}
                {!extractedInfo.isComplete && extractedInfo.missingFields.length > 0 && (
                  <p className={styles.missingInfo}>
                    不足情報: {extractedInfo.missingFields.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Message input */}
            <form onSubmit={handleSendMessage} className={styles.inputForm}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力..."
                className={styles.input}
                disabled={isSending}
              />
              <button type="submit" className={styles.sendButton} disabled={isSending}>
                送信
              </button>
            </form>
          </>
        ) : (
          <div className={styles.noSession}>
            <p>左側のサイドバーから新規チャットを開始するか、</p>
            <p>既存のセッションを選択してください。</p>
          </div>
        )}
      </div>

      {/* New session dialog */}
      {showNewSessionDialog && (
        <div className={styles.dialog}>
          <div className={styles.dialogContent}>
            <h2>新規チャットセッション</h2>
            <div className={styles.field}>
              <label>設備を選択</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className={styles.select}
              >
                <option value="">選択してください</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.equipmentId} - {eq.equipmentName}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>PDF添付（任意）</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              {pdfFile && (
                <div className={styles.selectedFile}>
                  選択: {pdfFile.name}
                  <button onClick={() => setPdfFile(null)}>×</button>
                </div>
              )}
            </div>
            <div className={styles.dialogActions}>
              <button
                onClick={() => {
                  setShowNewSessionDialog(false);
                  setSelectedEquipment('');
                  setPdfFile(null);
                }}
                className={styles.cancelButton}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateSession}
                disabled={
                  !selectedEquipment ||
                  createSessionMutation.isPending ||
                  uploadingPdf
                }
                className={styles.confirmButton}
              >
                {uploadingPdf ? 'アップロード中...' : '開始'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;

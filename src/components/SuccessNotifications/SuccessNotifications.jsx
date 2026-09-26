import React, { useEffect, useState } from "react";
import { FiCheckCircle, FiX } from "react-icons/fi";
import { subscribeSuccess } from "../../utils/successNotifications";
import styles from "./SuccessNotifications.module.scss";
function Notice({ notice, dismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hovered || focused) return undefined;
    const timer = setTimeout(() => dismiss(notice.id), 5000);
    return () => clearTimeout(timer);
  }, [notice.id, hovered, focused, dismiss]);
  return <div className={styles.notice} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <FiCheckCircle aria-hidden="true" /><span>{notice.message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(notice.id)}><FiX aria-hidden="true" /></button>
  </div>;
}
let nextId = 0;
export default function SuccessNotifications() {
  const [notices, setNotices] = useState([]);
  useEffect(() => subscribeSuccess(message => setNotices(current => [...current.filter(item => item.message !== message), {id: ++nextId, message}].slice(-3))), []);
  const dismiss = React.useCallback(id => setNotices(current => current.filter(item => item.id !== id)), []);
  return <div className={styles.stack} role="status" aria-live="polite" aria-atomic="false" aria-relevant="additions">{notices.map(notice => <Notice key={notice.id} notice={notice} dismiss={dismiss} />)}</div>;
}

/* 시트 입력칸. 목업 input 이벤트(3463~3466줄): 타이핑을 250ms 모아 주소 쿼리에 쓴다. 값은 로컬로 들고 있어 포커스가 안 끊긴다 */
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: string; onCommit: (v: string) => void };
export function DebouncedInput({ value, onCommit, ...rest }: Props) {
  const [v, setV] = useState(value);
  const dirty = useRef(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (!dirty.current) setV(value); }, [value]);
  return <input {...rest} value={v} onChange={e => {
    const nv = e.target.value; setV(nv); dirty.current = true;
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => { dirty.current = false; onCommit(nv); }, 250);
  }} />;
}

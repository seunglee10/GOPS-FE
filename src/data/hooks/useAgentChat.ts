import { useCallback } from "react";
import type { AgentContext, AgentView } from "../../api/types";
import { useDataSource } from "../source";
import { useMutation, useResource } from "./useResource";
/* D16 AI 대화. ask 는 답변이 올 때까지 기다리고, stop 으로 중단한다. 대화 상태(new|loading|answer)는 URL agent= 와 gops.ai 가 들고 있다 */
export function useAgentChat() {
  const ds = useDataSource();
  const ask = useMutation((question: string, ctx: AgentContext): Promise<AgentView> => ds.agent.ask(question, ctx));
  const stop = useCallback(() => ds.agent.stop(), [ds]);
  const threads = useResource(() => ds.agent.threads(), [ds]);
  const thread = useResource(() => ds.agent.thread("t1"), [ds]);
  return { ask, stop, threads, thread };
}

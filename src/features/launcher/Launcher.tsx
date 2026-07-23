import { ArrowRight, Boxes } from "lucide-react";

import { Button } from "../../components/ui/button";
import { PROGRAMS } from "./programs";

interface LauncherProps {
  onOpenReviewAnalyzer: () => void;
}

export function Launcher({ onOpenReviewAnalyzer }: LauncherProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-10 flex items-center justify-between border-b border-stone-200 pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-teal-700 text-white">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-teal-800">ReviewFlow Desktop</p>
            <p className="text-xs text-stone-500">로컬 우선 AI 업무 도구</p>
          </div>
        </div>
        <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
          Ollama 기본
        </span>
      </header>

      <section className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-teal-800">WORKSPACE</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">프로그램</h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          지금 필요한 업무 프로그램을 선택하세요. 프로그램은 같은 앱 안에서 독립적으로 동작하며
          앞으로 계속 추가할 수 있습니다.
        </p>
      </section>

      <section
        aria-label="프로그램 목록"
        className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {PROGRAMS.map((program) => {
          const Icon = program.icon;
          const available = program.status === "available";
          return (
            <article
              className="flex min-h-64 flex-col rounded-xl border border-stone-200 bg-white p-6"
              key={program.id}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-lg bg-stone-100 text-stone-700">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span
                  className={
                    available
                      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                      : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                  }
                >
                  {available ? "사용 가능" : "준비 중"}
                </span>
              </div>
              <h2 className="mt-6 text-xl font-bold text-stone-900">{program.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{program.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4">
                <span className="text-xs font-medium text-stone-500">{program.version}</span>
                {available ? (
                  <Button
                    aria-label={`${program.title} 열기`}
                    className="min-h-10 px-3"
                    onClick={onOpenReviewAnalyzer}
                    size="compact"
                  >
                    {program.title}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                ) : (
                  <Button disabled size="compact" variant="secondary">
                    아직 실행할 수 없음
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getTasks, updateTask, deleteTask, Task } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles, AlertCircle, Clock, CheckCircle2, Calendar, LayoutDashboard, BrainCircuit } from "lucide-react";
import TaskFormDialog from "./TaskFormDialog";
import AITaskInputDialog from "./AITaskInputDialog";
import { format, isPast, isToday, isThisWeek, parseISO, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";

export default function TasksDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isAITaskFormOpen, setIsAITaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getTasks();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleComplete = async (task: Task, isChecked: boolean) => {
    // Optimistic UI
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: isChecked ? "完了" : "進行中" } : t));
    await updateTask(task.id, { status: isChecked ? "完了" : "進行中" });
    loadData();
  };

  const isOverdue = (task: Task) => {
    if (task.status === "完了") return false;
    if (!task.dueDate) return false;
    const targetDate = parseISO(`${task.dueDate}T${task.dueTime || "23:59"}:00+09:00`);
    return isPast(targetDate);
  };

  const openEdit = (task: Task) => {
    setSelectedTask(task);
    setIsTaskFormOpen(true);
  };

  const now = startOfDay(new Date());

  // Metrics
  const activeTasks = tasks.filter(t => t.status !== "完了");
  const completedTasks = tasks.filter(t => t.status === "完了");
  
  const todayTasks = activeTasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)));
  const overdueTasks = activeTasks.filter(isOverdue);
  
  const thisWeekAll = tasks.filter(t => t.dueDate && isThisWeek(parseISO(t.dueDate), { weekStartsOn: 1 }));
  const thisWeekCompleted = thisWeekAll.filter(t => t.status === "完了");
  const completionRate = thisWeekAll.length > 0 ? Math.round((thisWeekCompleted.length / thisWeekAll.length) * 100) : 0;

  // AI Suggestions: Prioritize by overdue, high priority, and due today
  const aiSuggestions = [...activeTasks]
    .sort((a, b) => {
      // 1. Priority desc
      if (b.priority !== a.priority) return b.priority - a.priority;
      // 2. Overdue first
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      // 3. Date
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      return 1;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 lg:p-6 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-slate-700" />
            AIタスクマネージャー
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">優先度と期限からAIが今日やるべきことをご提案</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsAITaskFormOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
          >
            <Sparkles className="w-4 h-4" /> AI入力
          </Button>
          <Button 
            onClick={() => { setSelectedTask(null); setIsTaskFormOpen(true); }}
            variant="outline"
            className="shadow-sm gap-2"
          >
            <Plus className="w-4 h-4" /> 手動追加
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">今日のタスク</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-800">{todayTasks.length}</p>
        </div>
        
        <div className="bg-rose-50 p-4 rounded-xl shadow-sm border border-rose-100">
          <div className="flex items-center justify-between text-rose-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">期限切れ</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-rose-600">{overdueTasks.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">今週の完了率</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-emerald-600">{completionRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl shadow-md text-white">
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI秘書のおすすめ</span>
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
          </div>
          <ul className="text-xs space-y-1 mt-2">
            {aiSuggestions.length > 0 ? aiSuggestions.map((t, i) => (
              <li key={t.id} className="truncate font-medium flex items-center gap-1">
                <span className="text-indigo-400 font-black">{i+1}.</span> {t.title}
              </li>
            )) : <li className="text-slate-400">タスクは完了しています🎉</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            📋 すべてのタスク
          </h2>
        </div>
        
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-slate-400 font-medium">読み込み中...</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">タスクはありません</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold w-10"></th>
                  <th className="px-4 py-3 font-semibold">タスク</th>
                  <th className="px-4 py-3 font-semibold">優先度</th>
                  <th className="px-4 py-3 font-semibold">カテゴリー</th>
                  <th className="px-4 py-3 font-semibold">期限</th>
                  <th className="px-4 py-3 font-semibold">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(task => {
                  const overdue = isOverdue(task);
                  const isDone = task.status === "完了";
                  return (
                    <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${isDone ? 'opacity-50 bg-slate-50' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <Checkbox 
                          checked={isDone} 
                          onCheckedChange={(checked) => handleToggleComplete(task, !!checked)} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(task)} className={`font-bold text-left hover:underline ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-black ${task.priority === 5 ? 'text-rose-500' : task.priority >= 4 ? 'text-orange-500' : 'text-slate-400'}`}>
                          {Array(task.priority).fill('★').join('')}{Array(5 - task.priority).fill('☆').join('')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">{task.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        {task.dueDate ? (
                          <div className={`flex items-center gap-1 text-xs font-bold ${overdue ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-flex' : 'text-slate-600'}`}>
                            {overdue && <AlertCircle className="w-3 h-3" />}
                            {format(parseISO(task.dueDate), "MM/dd")}
                            {task.dueTime && ` ${task.dueTime}`}
                          </div>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full text-[10px] font-bold">期限切れ</span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            task.status === "完了" ? "bg-slate-200 text-slate-600" :
                            task.status === "進行中" ? "bg-blue-100 text-blue-800" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {task.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <TaskFormDialog 
        isOpen={isTaskFormOpen} 
        onClose={() => setIsTaskFormOpen(false)} 
        onRefresh={loadData}
        initialData={selectedTask}
      />

      <AITaskInputDialog
        isOpen={isAITaskFormOpen}
        onClose={() => setIsAITaskFormOpen(false)}
        onRefresh={loadData}
      />
    </div>
  );
}

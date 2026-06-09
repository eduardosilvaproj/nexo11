// ============================================
// SortableMenu — Drag and drop para reordenar grupos
// Ativado por modo de edição no sidebar
// ============================================

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  /** Quando true, mostra handle de drag e remove padding lateral */
  dragHandle?: boolean;
}

function SortableItem({ id, children, dragHandle = true }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "shadow-2xl shadow-sky-500/20 rounded-xl" : ""}`}
    >
      {dragHandle && (
        <button
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 p-1 rounded opacity-0 group-hover/sortable:opacity-100 hover:bg-white/[0.08] cursor-grab active:cursor-grabbing transition-opacity"
          aria-label="Arrastar para reordenar"
          onClick={(e) => e.preventDefault()}
        >
          <GripVertical className="h-3 w-3 text-slate-500" />
        </button>
      )}
      {children}
    </div>
  );
}

interface SortableMenuProps {
  items: { id: string; content: ReactNode }[];
  onReorder: (oldIndex: number, newIndex: number) => void;
}

export function SortableMenu({ items, onReorder }: SortableMenuProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {item.content}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}

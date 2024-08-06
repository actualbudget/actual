import React, { createRef, useRef } from 'react';

import { type CustomReportEntity } from 'loot-core/types/models/reports';

import { MenuButton } from '../../common/MenuButton';
import { Popover } from '../../common/Popover';
import { SaveReportDelete } from '../SaveReportDelete';
import { SaveReportName } from '../SaveReportName';

import { ListCardsMenu } from './ListCardsMenu';

type ListCardsPopoverProps = {
  report: CustomReportEntity;
  onMenuOpen: (item: string, state: boolean) => void;
  isCardHovered: string;
  reportMenu: { [key: string]: boolean }[];
  onMenuSelect: (item: string, report: CustomReportEntity) => void;
  nameMenuOpen: { [key: string]: boolean }[];
  onNameMenuOpen: (item: string, state: boolean) => void;
  name: string;
  setName: (name: string) => void;
  onAddUpdate: ({ reportData }: { reportData?: CustomReportEntity }) => void;
  err: string;
  deleteMenuOpen: { [key: string]: boolean }[];
  onDeleteMenuOpen: (item: string, state: boolean) => void;
  onDelete: (reportData: string) => void;
};
export function ListCardsPopover({
  report,
  onMenuOpen,
  isCardHovered,
  reportMenu,
  onMenuSelect,
  nameMenuOpen,
  onNameMenuOpen,
  name,
  setName,
  onAddUpdate,
  err,
  deleteMenuOpen,
  onDeleteMenuOpen,
  onDelete,
}: ListCardsPopoverProps) {
  const triggerRef = useRef(null);
  const inputRef = createRef<HTMLInputElement>();

  return (
    <>
      <MenuButton
        aria-label="Report menu"
        ref={triggerRef}
        onPress={() =>
          onMenuOpen(report.id === undefined ? '' : report.id, true)
        }
        style={{
          color: isCardHovered === report.id ? 'inherit' : 'transparent',
        }}
      />

      <Popover
        triggerRef={triggerRef}
        isOpen={
          !!(report.id && reportMenu[report.id as keyof typeof reportMenu])
        }
        onOpenChange={() =>
          onMenuOpen(report.id === undefined ? '' : report.id, false)
        }
        style={{ width: 120 }}
      >
        <ListCardsMenu onMenuSelect={onMenuSelect} report={report} />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={
          !!(report.id && nameMenuOpen[report.id as keyof typeof nameMenuOpen])
        }
        onOpenChange={() =>
          onNameMenuOpen(report.id === undefined ? '' : report.id, false)
        }
        style={{ width: 325 }}
      >
        <SaveReportName
          menuItem="rename"
          name={name}
          setName={setName}
          inputRef={inputRef}
          onAddUpdate={onAddUpdate}
          err={err}
          report={report}
        />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={
          !!(
            report.id &&
            deleteMenuOpen[report.id as keyof typeof deleteMenuOpen]
          )
        }
        onOpenChange={() =>
          onDeleteMenuOpen(report.id === undefined ? '' : report.id, false)
        }
        style={{ width: 275, padding: 15 }}
      >
        <SaveReportDelete
          onDelete={() => onDelete(report.id)}
          onClose={() =>
            onDeleteMenuOpen(report.id === undefined ? '' : report.id, false)
          }
          name={report.name}
        />
      </Popover>
    </>
  );
}

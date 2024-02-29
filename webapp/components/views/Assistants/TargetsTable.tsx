// Copyright 2024 mik
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useContext, useState } from 'react';
import { Copy, Edit, MoreHorizontal, Trash } from 'lucide-react';
import useBackend from '@/hooks/useBackendContext';
import useTranslation from '@/hooks/useTranslation';
import { AssistantTarget } from '@/types';
import { getAllModels } from '@/utils/data/models';
import { AppContext } from '@/context';
import ModelInfos from '@/components/common/ModelInfos';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';

type TargetsTableProps = {
  targets: AssistantTarget[];
  onEdit: (target: AssistantTarget) => void;
  onDuplicate: (target: AssistantTarget) => void;
  onDelete: (target: AssistantTarget) => void;
};

function TargetsTable({ targets, onEdit, onDuplicate, onDelete }: TargetsTableProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { backendContext } = useBackend();
  const { providers } = useContext(AppContext);
  const models = getAllModels(providers, backendContext);
  const renderModel = (targetModels: string[] | undefined) => {
    const model = targetModels ? models.find((m) => m.name === targetModels[0]) : undefined;
    if (!model) return <div>{t('Model not found')}</div>;
    return (
      <div className="flex w-full justify-between gap-2 pr-4">
        {model.title || model.name}
        <ModelInfos model={model} displayName={false} />
      </div>
    );
  };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Name')}</TableHead>
          <TableHead>{t('Model')}</TableHead>
          <TableHead>{t('Provider')}</TableHead>
          <TableHead> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map((target) => (
          <TableRow key={target.id} className="min-h-[28px]">
            <TableCell>{target.name || 'undefined'}</TableCell>
            <TableCell>{renderModel(target.models)}</TableCell>
            <TableCell>{target.provider || 'None'}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu
                open={open[target.id]}
                onOpenChange={(value) => setOpen({ ...open, [target.id]: value })}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-full">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onSelect={() => {
                        onEdit(target);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {t('Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        onDuplicate(target);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {t('Duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onSelect={() => {
                        onDelete(target);
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" strokeWidth={1.5} />
                      {t('Delete')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default TargetsTable;

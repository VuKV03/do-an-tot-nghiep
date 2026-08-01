import React from 'react';
import ThamDinhChuDeMain from './chu-de/tham-dinh-chu-de/index';
import { Question, TopicNode, SystemUser } from '../../types';

interface QuestionTopicsModuleProps {
  questions?: Question[];
  onTopicsUpdate?: (updatedTree: { [key: string]: TopicNode[] }) => void;
  currentUser?: SystemUser | null;
}

export default function QuestionTopicsModule({ currentUser }: QuestionTopicsModuleProps) {
  return <ThamDinhChuDeMain currentUser={currentUser} />;
}

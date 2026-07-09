import React from 'react';
import ThamDinhChuDeMain from './chu-de/tham-dinh-chu-de/index';
import { Question, TopicNode } from '../../types';

interface QuestionTopicsModuleProps {
  questions?: Question[];
  onTopicsUpdate?: (updatedTree: { [key: string]: TopicNode[] }) => void;
}

export default function QuestionTopicsModule(props: QuestionTopicsModuleProps) {
  return <ThamDinhChuDeMain />;
}

import React from 'react';
import ChuDeCauHoi from './quan-ly-nhch/chu-de/chu-de-cau-hoi/index';
import { Question, TopicNode } from '../types';

interface QuestionTopicsModuleProps {
  questions?: Question[];
  onTopicsUpdate?: (updatedTree: { [key: string]: TopicNode[] }) => void;
}

export default function QuestionTopicsModule(props: QuestionTopicsModuleProps) {
  return <ChuDeCauHoi />;
}

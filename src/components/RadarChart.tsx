import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface Props {
  data: { topic: string; score: number }[];
}

export const RadarChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-64 md:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="topic" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#71717a' }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.4}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
            itemStyle={{ color: '#3b82f6' }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};

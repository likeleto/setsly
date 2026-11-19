import { Link, type LinkProps } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { type Exercise } from '@/types';

interface ExerciseCardProps extends Omit<LinkProps, 'to' | 'className' | 'children'> {
  exercise: Exercise;
}

export default function ExerciseCard({ exercise, ...props }: ExerciseCardProps) {
  return (
    <Link to={`/workout/${exercise.key}`} className="block" {...props}>
      <Card className="cursor-pointer transition-colors hover:border-primary/70 hover:bg-[#222222]">
        <CardContent className="flex flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-4xl">{exercise.icon}</span>
          <span className="text-base font-medium">{exercise.name}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

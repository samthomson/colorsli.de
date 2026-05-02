import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Create = () => {
  useSeoMeta({
    title: 'Color Slide - Create',
    description: 'Create and publish your own Color Slide levels.',
  });

  return (
    <Template title="Create" subtitle="Build your own levels and publishing workflow.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Create mode scaffold</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          This page is ready for a level editor, validation tools, and eventual publishing.
        </CardContent>
      </Card>
    </Template>
  );
};

export default Create;

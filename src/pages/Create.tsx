import { useSeoMeta } from '@unhead/react';
import { AppShell } from '@/components/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Create = () => {
  useSeoMeta({
    title: 'Colour Slide - Create',
    description: 'Create and publish your own Colour Slide levels.',
  });

  return (
    <AppShell title="Create" subtitle="Build your own levels and publishing workflow.">
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Create mode scaffold</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          This page is ready for a level editor, validation tools, and eventual publishing.
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Create;

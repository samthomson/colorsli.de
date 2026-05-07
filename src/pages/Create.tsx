import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { RequireLogin } from '@/components/auth/RequireLogin';
import { LevelEditor } from '@/components/levels/LevelEditor';

const Create = () => {
  useSeoMeta({
    title: 'Color Slide - Create',
    description: 'Design and publish your own Color Slide levels.',
  });

  return (
    <Template pageName="Create" subtitle="Design a board, validate it, publish it to Nostr.">
      <RequireLogin message="Log in with Nostr to publish your own levels.">
        <LevelEditor />
      </RequireLogin>
    </Template>
  );
};

export default Create;

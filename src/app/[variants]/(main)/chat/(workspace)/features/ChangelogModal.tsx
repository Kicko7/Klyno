import ChangelogModal from '@/features/ChangelogModal';
import ChangelogService from '@/services/changelog/index';

const Changelog = async () => {
  const service = new ChangelogService();
  const id = await service.getLatestChangelogId();

  return <ChangelogModal currentId={id} />;
};

export default Changelog;

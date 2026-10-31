import DevicesActivityView from '@/views/system-settings/devices/DevicesActivityView';

export const metadata = { title: 'Devices & Activity' };

export default function DevicesActivityPage() {
  return (
    <div className="p-4 md:p-6">
      <DevicesActivityView />
    </div>
  );
}

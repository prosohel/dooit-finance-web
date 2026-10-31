'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconAlertTriangle,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconLoader2,
  IconMapPin,
  IconNetwork,
  IconRefresh,
  IconServer,
  IconShieldCheck,
  IconShieldOff,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dateShowFormatWithTime } from '@/lib/utils';

import {
  getAuditActivity,
  getAuditSummary,
  getDevices,
  updateDeviceTrust,
} from '@/app/dashboard/client/system-settings/devices/actions';

const PAGE_SIZE = 25;

const DEVICE_ICONS = {
  mobile: IconDeviceMobile,
  tablet: IconDeviceTablet,
  server: IconServer,
  desktop: IconDeviceDesktop,
  unknown: IconDeviceDesktop,
};

const SERVICE_VARIANTS = {
  auth: 'info',
  case: 'default',
  cra: 'warning',
  kyb: 'warning',
  sumsub: 'muted',
  device: 'dark',
};

const SERVICE_OPTIONS = ['all', 'auth', 'case', 'cra', 'kyb', 'sumsub', 'device'];

const SummaryCard = ({ title, value, icon: Icon, danger }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`size-4 ${danger ? 'text-danger' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-semibold tabular-nums ${danger ? 'text-danger' : ''}`}>
        {value ?? '—'}
      </div>
    </CardContent>
  </Card>
);

export default function DevicesActivityView() {
  const [summary, setSummary] = useState(null);

  const [devices, setDevices] = useState([]);
  const [devicesTotal, setDevicesTotal] = useState(0);
  const [devicesPage, setDevicesPage] = useState(1);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [trustBusy, setTrustBusy] = useState(null);

  const [activity, setActivity] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityService, setActivityService] = useState('all');
  const [activityLoading, setActivityLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    const res = await getAuditSummary().catch(() => null);
    if (res?.success) setSummary(res.data);
  }, []);

  const loadDevices = useCallback(async (page) => {
    setDevicesLoading(true);
    const res = await getDevices({ page, limit: PAGE_SIZE }).catch(() => null);
    if (res?.success) {
      setDevices(res.data ?? []);
      setDevicesTotal(res.totalRecords ?? 0);
    } else {
      toast.error(res?.message || 'Failed to load devices');
    }
    setDevicesLoading(false);
  }, []);

  const loadActivity = useCallback(async (page, service) => {
    setActivityLoading(true);
    const res = await getAuditActivity({
      page,
      limit: PAGE_SIZE,
      ...(service !== 'all' && { service }),
    }).catch(() => null);
    if (res?.success) {
      setActivity(res.data ?? []);
      setActivityTotal(res.totalRecords ?? 0);
    } else {
      toast.error(res?.message || 'Failed to load activity');
    }
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadDevices(devicesPage);
  }, [devicesPage, loadDevices]);

  useEffect(() => {
    loadActivity(activityPage, activityService);
  }, [activityPage, activityService, loadActivity]);

  const handleToggleTrust = async (device) => {
    setTrustBusy(device._id);
    const res = await updateDeviceTrust(device._id, {
      isTrusted: !device.isTrusted,
    }).catch(() => null);
    if (res?.success) {
      toast.success(res.data.isTrusted ? 'Device marked as trusted' : 'Device trust revoked');
      setDevices((prev) =>
        prev.map((d) => (d._id === device._id ? { ...d, isTrusted: res.data.isTrusted } : d))
      );
    } else {
      toast.error(res?.message || 'Failed to update device');
    }
    setTrustBusy(null);
  };

  const devicePages = Math.max(1, Math.ceil(devicesTotal / PAGE_SIZE));
  const activityPages = Math.max(1, Math.ceil(activityTotal / PAGE_SIZE));

  const Pager = ({ page, pages, onChange }) => (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        Page {page} of {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Devices &amp; Activity</h1>
          <p className="text-sm text-muted-foreground">
            Every device that has accessed the platform, and the audit trail of who did what, from
            where.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadSummary();
            loadDevices(devicesPage);
            loadActivity(activityPage, activityService);
          }}
        >
          <IconRefresh className="size-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Failed logins (24h)"
          value={summary?.failedLogins24h}
          icon={IconAlertTriangle}
          danger={Boolean(summary?.failedLogins24h)}
        />
        <SummaryCard
          title="Devices seen (7d)"
          value={summary?.distinctDevices7d}
          icon={IconDeviceDesktop}
        />
        <SummaryCard title="IP addresses (7d)" value={summary?.distinctIps7d} icon={IconNetwork} />
        <SummaryCard
          title="Audit entries"
          value={summary?.byService?.reduce((s, x) => s + x.count, 0)}
          icon={IconShieldCheck}
        />
      </div>

      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardContent className="pt-4">
              {devicesLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <IconLoader2 className="size-5 animate-spin" /> Loading devices…
                </div>
              ) : devices.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No devices recorded yet. Devices appear here after users sign in.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>OS / Browser</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Logins</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((d) => {
                        const Icon = DEVICE_ICONS[d.deviceType] || IconDeviceDesktop;
                        return (
                          <TableRow key={d._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="size-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{d.uid || d.deviceId}</div>
                                  <div className="text-xs capitalize text-muted-foreground">
                                    {d.deviceType}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{d.user?.name || '—'}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {[d.os, d.osVersion].filter(Boolean).join(' ') || '—'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {[d.browser, d.browserVersion].filter(Boolean).join(' ')}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {d.ipAddress || '—'}
                              {(d.city || d.country) && (
                                <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                                  <IconMapPin className="size-3" />
                                  {[d.city, d.country].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {d.lastLoginAt ? dateShowFormatWithTime(d.lastLoginAt) : '—'}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {d.loginCount ?? 0}
                            </TableCell>
                            <TableCell>
                              {d.riskFlags?.length ? (
                                <StatusPill variant="danger">
                                  {d.riskFlags.length} risk flag{d.riskFlags.length > 1 ? 's' : ''}
                                </StatusPill>
                              ) : d.isTrusted ? (
                                <StatusPill variant="success">Trusted</StatusPill>
                              ) : (
                                <StatusPill variant="muted">Unverified</StatusPill>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={trustBusy === d._id}
                                onClick={() => handleToggleTrust(d)}
                              >
                                {trustBusy === d._id ? (
                                  <IconLoader2 className="size-4 animate-spin" />
                                ) : d.isTrusted ? (
                                  <>
                                    <IconShieldOff className="size-4" /> Revoke trust
                                  </>
                                ) : (
                                  <>
                                    <IconShieldCheck className="size-4" /> Trust
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <Pager page={devicesPage} pages={devicePages} onChange={setDevicesPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Select
                  value={activityService}
                  onValueChange={(v) => {
                    setActivityPage(1);
                    setActivityService(v);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'all' ? 'All services' : s.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {activityTotal} entries
                </span>
              </div>

              {activityLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                  <IconLoader2 className="size-5 animate-spin" /> Loading activity…
                </div>
              ) : activity.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No audit activity found for this filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Device</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.map((a) => (
                        <TableRow key={a._id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {dateShowFormatWithTime(a.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.user?.name || a.actor?.name || a.actorName || 'System'}
                          </TableCell>
                          <TableCell>
                            <StatusPill variant={SERVICE_VARIANTS[a.service] || 'muted'}>
                              {a.service}
                            </StatusPill>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{a.action}</span>
                            {a.status === 'failed' && (
                              <StatusPill variant="danger" className="ml-2">
                                failed
                              </StatusPill>
                            )}
                          </TableCell>
                          <TableCell className="max-w-90 truncate text-sm text-muted-foreground">
                            {a.details ||
                              (a.case?.uid && `Case ${a.case.uid}`) ||
                              (a.customer?.uid && `Customer ${a.customer.uid}`) ||
                              '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{a.ip || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.device
                              ? [a.device.os, a.device.browser].filter(Boolean).join(' · ') ||
                                a.device.uid
                              : a.deviceId
                                ? a.deviceId.slice(0, 14) + '…'
                                : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pager page={activityPage} pages={activityPages} onChange={setActivityPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

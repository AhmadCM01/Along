-- KEYS[1] = pool:{c:d:a}             (ZSET of rr_ids, score = enqueue ms adjusted by priority)
-- ARGV[1] = pod_size (4, or 3 for partial)
-- ARGV[2] = pod_id (uuid from caller)
-- ARGV[3] = now_ms
-- ARGV[4] = hash-tag prefix "{c:d:a}" (to build req keys in the same slot)
-- ARGV[5] = min_wait_ms_for_partial (0 for full pods)
local size = tonumber(ARGV[1])
if redis.call('ZCARD', KEYS[1]) < size then return {} end
local members = redis.call('ZRANGE', KEYS[1], 0, size - 1)
if tonumber(ARGV[5]) > 0 then
  local oldest = redis.call('HGET', 'req:' .. ARGV[4] .. ':' .. members[1], 'enqueued_ms')
  if not oldest or (tonumber(ARGV[3]) - tonumber(oldest)) < tonumber(ARGV[5]) then return {} end
end
for i, m in ipairs(members) do
  local rk = 'req:' .. ARGV[4] .. ':' .. m
  if redis.call('HGET', rk, 'state') ~= 'QUEUED' then
    redis.call('ZREM', KEYS[1], m)
    return {'RETRY'}
  end
end
redis.call('ZREM', KEYS[1], unpack(members))
for i, m in ipairs(members) do
  redis.call('HSET', 'req:' .. ARGV[4] .. ':' .. m, 'state', 'PODDED', 'pod_id', ARGV[2])
end
return members

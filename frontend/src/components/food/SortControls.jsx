import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowDownward, ArrowUpward, LocationOn, Restaurant, Schedule, Star } from '@mui/icons-material';

const SORT_OPTIONS = [
  { value: 'freshness_score', label: 'Freshness', icon: <Star fontSize="small" /> },
  { value: 'distance',        label: 'Distance',  icon: <LocationOn fontSize="small" /> },
  { value: 'quantity',        label: 'Quantity',  icon: <Restaurant fontSize="small" /> },
  { value: 'expiry_time',     label: 'Expiry',    icon: <Schedule fontSize="small" /> },
  { value: 'created_at',      label: 'Newest',    icon: <Schedule fontSize="small" /> },
];

const ORDER_LABEL = {
  freshness_score: { desc: 'Highest first', asc: 'Lowest first' },
  distance:        { asc: 'Nearest first', desc: 'Farthest first' },
  quantity:        { desc: 'Most first',   asc: 'Least first' },
  expiry_time:     { asc: 'Soonest',       desc: 'Latest' },
  created_at:      { desc: 'Newest first', asc: 'Oldest first' },
};

const SortControls = ({ sortBy, sortOrder, onSortChange }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={{ xs: 1, sm: 2 }}
      flexWrap="wrap"
      sx={{
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      {!isMobile && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          Sort by:
        </Typography>
      )}

      <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 170 } }}>
        {isMobile && <InputLabel>Sort by</InputLabel>}
        {!isMobile && <InputLabel>Criteria</InputLabel>}
        <Select
          value={sortBy}
          label={isMobile ? 'Sort by' : 'Criteria'}
          onChange={(e) => onSortChange(e.target.value, sortOrder)}
        >
          {SORT_OPTIONS.map(({ value, label, icon }) => (
            <MenuItem key={value} value={value}>
              <Box display="flex" alignItems="center" gap={1}>
                {icon}
                <Typography variant="body2">{label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <ToggleButtonGroup
        value={sortOrder}
        exclusive
        onChange={(_, v) => v && onSortChange(sortBy, v)}
        size="small"
        aria-label="sort order"
      >
        <ToggleButton value="desc" aria-label="descending">
          <ArrowDownward fontSize="small" />
        </ToggleButton>
        <ToggleButton value="asc" aria-label="ascending">
          <ArrowUpward fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      {!isMobile && (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {ORDER_LABEL[sortBy]?.[sortOrder] ?? ''}
        </Typography>
      )}
    </Box>
  );
};

export default SortControls;

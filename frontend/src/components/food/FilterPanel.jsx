import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Drawer,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Clear, FilterList, ExpandLess, ExpandMore, Close } from '@mui/icons-material';
import { useEffect, useState } from 'react';

const FOOD_TYPES = [
  'Main Course', 'Appetizer', 'Dessert', 'Beverage',
  'Snack', 'Bread & Bakery', 'Fruits', 'Vegetables', 'Dairy', 'Other',
];

const DEFAULT_FILTERS = {
  food_type: '',
  max_distance: 10,
  max_expiry_hours: 24,
  is_vegetarian: false,
  is_vegan: false,
  is_gluten_free: false,
  search_query: '',
};

const FilterPanel = ({ filters, onFilterChange, loading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState({ ...DEFAULT_FILTERS, ...filters });

  useEffect(() => {
    setLocal(prev => ({ ...prev, ...filters }));
  }, [filters]);

  const set = (key, value) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    if (key !== 'search_query') apply(next);
  };

  const apply = (f = local) => {
    const clean = Object.entries(f).reduce((acc, [k, v]) => {
      if (v === '' || v === null || v === undefined) return acc;
      if (typeof v === 'boolean' && !v) return acc;
      acc[k] = v;
      return acc;
    }, {});
    onFilterChange(clean);
  };

  const clear = () => {
    setLocal(DEFAULT_FILTERS);
    onFilterChange({});
  };

  const activeCount = Object.entries(local).filter(([k, v]) => {
    if (k === 'max_distance' && v === 10) return false;
    if (k === 'max_expiry_hours' && v === 24) return false;
    if (typeof v === 'boolean') return v;
    return v !== '' && v !== null && v !== undefined;
  }).length;

  const filterContent = (
    <Box sx={{ p: isMobile ? 2 : 0 }}>
      {isMobile && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>Filters</Typography>
          <IconButton onClick={() => setDrawerOpen(false)} size="small"><Close /></IconButton>
        </Box>
      )}

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <TextField
          fullWidth
          size="small"
          label="Search food items"
          placeholder="e.g., pizza, salad…"
          value={local.search_query}
          onChange={(e) => setLocal(p => ({ ...p, search_query: e.target.value }))}
          onBlur={() => apply()}
          disabled={loading}
          sx={{ mb: 2 }}
        />
      </form>

      {/* Food type + distance row */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Food Type</InputLabel>
            <Select
              value={local.food_type}
              label="Food Type"
              onChange={(e) => set('food_type', e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">All Types</MenuItem>
              {FOOD_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Max Distance: <strong>{local.max_distance} km</strong>
          </Typography>
          <Slider
            value={local.max_distance}
            onChange={(_, v) => set('max_distance', v)}
            min={1} max={50} step={1}
            disabled={loading}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Grid>
      </Grid>

      {/* Advanced toggle (desktop only) */}
      {!isMobile && (
        <Button
          size="small"
          endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
          onClick={() => setExpanded(p => !p)}
          sx={{ mb: 1 }}
        >
          {expanded ? 'Less filters' : 'More filters'}
        </Button>
      )}

      {/* Advanced filters */}
      <Collapse in={expanded || isMobile}>
        <Box pt={isMobile ? 0 : 1} borderTop={isMobile ? 0 : 1} borderColor="divider">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Dietary
              </Typography>
              <FormGroup row={isMobile}>
                {[
                  { key: 'is_vegetarian', label: 'Vegetarian' },
                  { key: 'is_vegan', label: 'Vegan' },
                  { key: 'is_gluten_free', label: 'Gluten-Free' },
                ].map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        size="small"
                        checked={local[key]}
                        onChange={(e) => set(key, e.target.checked)}
                        disabled={loading}
                      />
                    }
                    label={<Typography variant="body2">{label}</Typography>}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Expires within: <strong>{local.max_expiry_hours} h</strong>
              </Typography>
              <Slider
                value={local.max_expiry_hours}
                onChange={(_, v) => set('max_expiry_hours', v)}
                min={1} max={72} step={1}
                marks={[{ value: 1, label: '1h' }, { value: 24, label: '24h' }, { value: 72, label: '72h' }]}
                disabled={loading}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Mobile action buttons */}
      {isMobile && (
        <Box display="flex" gap={1.5} mt={3}>
          <Button fullWidth variant="contained" onClick={() => { apply(); setDrawerOpen(false); }} disabled={loading}>
            Apply
          </Button>
          <Button fullWidth variant="outlined" onClick={clear} disabled={loading}>
            Clear
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
      {/* Header row */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={isMobile ? 0 : 2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterList color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={600} color="primary">
            Filters
          </Typography>
          {activeCount > 0 && (
            <Chip label={activeCount} size="small" color="primary" />
          )}
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          {activeCount > 0 && (
            <Button size="small" startIcon={<Clear />} onClick={clear} disabled={loading}>
              Clear
            </Button>
          )}
          {isMobile ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setDrawerOpen(true)}
            >
              Filter{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          ) : null}
        </Box>
      </Box>

      {/* Desktop inline filters */}
      {!isMobile && filterContent}

      {/* Mobile drawer */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90vh', overflowY: 'auto' },
        }}
      >
        {filterContent}
      </Drawer>
    </Paper>
  );
};

export default FilterPanel;

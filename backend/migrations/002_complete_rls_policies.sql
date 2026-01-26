-- =====================================================
-- POLÍTICAS RLS COMPLETAS - SIN RECURSIÓN
-- =====================================================

-- =====================================================
-- POLÍTICAS PARA: churches
-- =====================================================

CREATE POLICY "Allow church creation during signup"
ON churches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own church"
ON churches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = churches.id
  )
);

CREATE POLICY "Admins can update their church"
ON churches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = churches.id AND users.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: users
-- =====================================================

CREATE POLICY "Allow user creation during signup"
ON users FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own profile"
ON users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can create users"
ON users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.church_id = users.church_id AND u.role = 'admin'
  )
);

CREATE POLICY "Admins can update users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.church_id = users.church_id AND u.role = 'admin'
  )
);

CREATE POLICY "Admins can delete users"
ON users FOR DELETE
USING (
  id != auth.uid() AND
  EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.church_id = users.church_id AND u.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: color_configuration
-- =====================================================

CREATE POLICY "Allow color_configuration creation"
ON color_configuration FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = color_configuration.church_id
  )
  OR NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Users can view their church configuration"
ON color_configuration FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = color_configuration.church_id
  )
);

CREATE POLICY "Admins can update configuration"
ON color_configuration FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = color_configuration.church_id AND users.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: sympathizers
-- =====================================================

CREATE POLICY "Users can view sympathizers from their church"
ON sympathizers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = sympathizers.church_id
  )
);

CREATE POLICY "Users can create sympathizers"
ON sympathizers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = sympathizers.church_id
  )
);

CREATE POLICY "Users can update sympathizers"
ON sympathizers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = sympathizers.church_id
  )
);

CREATE POLICY "Admins can delete sympathizers"
ON sympathizers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = sympathizers.church_id AND users.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: contacts
-- =====================================================

CREATE POLICY "Users can view contacts from their church"
ON contacts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = contacts.sympathizer_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can create contacts"
ON contacts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = contacts.sympathizer_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can update their own contacts"
ON contacts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete contacts"
ON contacts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = contacts.sympathizer_id AND u.id = auth.uid() AND u.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: visits
-- =====================================================

CREATE POLICY "Users can view visits from their church"
ON visits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = visits.sympathizer_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can create visits"
ON visits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = visits.sympathizer_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Users can update visits"
ON visits FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = visits.sympathizer_id AND u.id = auth.uid()
  )
);

CREATE POLICY "Admins can delete visits"
ON visits FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM sympathizers s
    JOIN users u ON u.church_id = s.church_id
    WHERE s.id = visits.sympathizer_id AND u.id = auth.uid() AND u.role = 'admin'
  )
);

-- =====================================================
-- POLÍTICAS PARA: notifications_config
-- =====================================================

CREATE POLICY "Allow notifications_config creation"
ON notifications_config FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = notifications_config.church_id
  )
  OR NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid())
);

CREATE POLICY "Users can view their church notifications config"
ON notifications_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = notifications_config.church_id
  )
);

CREATE POLICY "Admins can update notifications config"
ON notifications_config FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = notifications_config.church_id AND users.role = 'admin'
  )
);
